const Submission = require("../models/Submissions");
const Question = require("../models/Question");
const { languageMap } = require("../utils/languageMap");
const { getJudge } = require("@pomelo/code-gen");

// Helper function to remove trailing whitespace/newlines from output
const removeTrailingLineCommands = (output) => {
    if (typeof output !== 'string') return output;
    return output.replace(/\s+$/g, '');
};

// Common logic for executing code against test cases
const executeTestCases = async ({ question, code, language, testCases, judge0Id }) => {
    const judge0Url = process.env.JUDGE0_URL || 'http://localhost:2358';

    // Wrap code
    let wrappedCode = code;
    try {
        const judge = getJudge(language.toLowerCase());
        const problemConfig = {
            method: question.functionName || 'solve',
            input: (question.inputVariables || []).map(v => ({
                variable: v.variable,
                type: v.type
            }))
        };
        wrappedCode = judge.wrapCode(code, problemConfig);
    } catch (err) {
        console.warn(`Could not wrap code for ${language}, using original code:`, err.message);
    }

    const executionPromises = testCases.map(async (tc, index) => {
        // Prepare input
        let input = '';
        if (typeof tc.input === 'object' && tc.input !== null) {
            const values = [];
            for (const inputVar of (question.inputVariables || [])) {
                const value = tc.input[inputVar.variable];
                if (Array.isArray(value)) {
                    values.push(value.length);
                    values.push(...value);
                } else {
                    values.push(value);
                }
            }
            input = values.join(' ');
        } else if (typeof tc.input === 'string') {
            input = tc.input.trim().replace(/,/g, ' ').replace(/\s+/g, ' ');
        } else {
            input = String(tc.input);
        }

        const expectedOutput = removeTrailingLineCommands(tc.output.trim());
        const base64SourceCode = Buffer.from(wrappedCode).toString('base64');
        const base64Input = Buffer.from(input).toString('base64');

        try {
            const response = await fetch(`${judge0Url}/submissions?base64_encoded=true&wait=true`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    source_code: base64SourceCode,
                    language_id: judge0Id,
                    stdin: base64Input,
                    expected_output: Buffer.from(expectedOutput).toString('base64'),
                }),
            });
            const result = await response.json();
            const isPassed = result.status && result.status.id === 3;

            const decodedStdout = result.stdout ? Buffer.from(result.stdout, 'base64').toString('utf-8') : '';
            const decodedStderr = result.stderr ? Buffer.from(result.stderr, 'base64').toString('utf-8') : '';
            const decodedCompileOutput = result.compile_output ? Buffer.from(result.compile_output, 'base64').toString('utf-8') : '';

            return {
                testCase: index + 1,
                passed: isPassed,
                input: tc.isVisible ? input : undefined, // Hide input if not visible
                expectedOutput: tc.isVisible ? expectedOutput : undefined,
                actualOutput: tc.isVisible ? removeTrailingLineCommands(decodedStdout || "") : undefined,
                error: decodedStderr || decodedCompileOutput || (result.status ? result.status.description : "Unknown Error"),
                status: result.status ? result.status.description : "Unknown",
                isVisible: tc.isVisible
            };
        } catch (err) {
            return {
                testCase: index + 1,
                passed: false,
                status: "System Error",
                error: err.message,
                isVisible: tc.isVisible
            };
        }
    });

    return await Promise.all(executionPromises);
};

// @desc    Run code against visible test cases only
const runCode = async (req, res, next) => {
    try {
        const { questionId, code, language } = req.body;
        if (!questionId || !code || !language) {
            return res.status(400).json({ success: false, error: "Missing required fields" });
        }

        const question = await Question.findById(questionId);
        if (!question) return res.status(404).json({ success: false, error: "Question not found" });

        const judge0Id = languageMap[language.toLowerCase()];
        if (!judge0Id) return res.status(400).json({ success: false, error: "Unsupported language" });

        const visibleTestCases = (question.testcases || []).filter(tc => tc.isVisible);

        // If no testcases are marked visible, take the first one as a fallback for user feedback
        const testToRun = visibleTestCases.length > 0 ? visibleTestCases : (question.testcases?.[0] ? [question.testcases[0]] : []);

        const results = await executeTestCases({
            question,
            code,
            language,
            testCases: testToRun,
            judge0Id
        });

        return res.status(200).json({
            success: true,
            results,
            passedCount: results.filter(r => r.passed).length,
            totalCount: results.length
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Submit code and save results
const submitCode = async (req, res, next) => {
    try {
        const { contestId, questionId, code, language } = req.body;
        const userId = req.user.id || req.user._id || req.user.sub;
        // contestId is validated by middleware if part of URL or body, but here middleware is usually mounted on /:id
        // However, middleware checks req.params.id || req.body.contestId.
        // So we can assume req.contest exists if the route uses the middleware.

        if (!questionId || !code || !language) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        const question = await Question.findById(questionId);
        if (!question) return res.status(404).json({ error: "Question not found" });

        const judge0Id = languageMap[language.toLowerCase()];
        if (!judge0Id) return res.status(400).json({ error: "Unsupported language" });

        // Submit runs against ALL test cases for scoring
        const allTestCases = question.testcases || [];
        const results = await executeTestCases({
            question,
            code,
            language,
            testCases: allTestCases,
            judge0Id
        });

        const passedCount = results.filter(r => r.passed).length;
        const totalCount = allTestCases.length;
        const score = totalCount > 0 ? (passedCount / totalCount) * (question.marks || 0) : 0;

        let overallStatus = "Accepted";
        if (passedCount < totalCount) {
            if (results.some(r => r.status?.includes("Compilation"))) overallStatus = "Compilation Error";
            else if (results.some(r => r.status?.includes("Time Limit"))) overallStatus = "Time Limit Exceeded";
            else overallStatus = "Wrong Answer";
        }

        // Save submission
        let submission = await Submission.findOne({ contest: contestId, user: userId });
        if (!submission) {
            submission = new Submission({ contest: contestId, user: userId, submissions: [] });
        }

        const entry = {
            question: questionId,
            code,
            language,
            status: overallStatus,
            score,
            testCaseResults: results,
            submittedAt: new Date()
        };

        const existingIdx = submission.submissions.findIndex(s => s.question.toString() === questionId);
        if (existingIdx > -1) submission.submissions[existingIdx] = entry;
        else submission.submissions.push(entry);

        submission.totalScore = submission.submissions.reduce((acc, curr) => acc + (curr.score || 0), 0);
        await submission.save();

        return res.status(200).json({
            success: true,
            results, // Frontend will receive filtered input/output for hidden cases via executeTestCases logic
            score,
            overallStatus
        });
    } catch (error) {
        next(error);
    }
};

// Save MCQ answer
const saveMCQ = async (req, res, next) => {
    try {
        const { contestId, questionId, answer } = req.body;
        const userId = req.user.id || req.user._id || req.user.sub;

        const questionDoc = await Question.findById(questionId);
        if (!questionDoc) return res.status(404).json({ error: "Question not found" });

        let score = 0;
        const submittedAnswers = Array.isArray(answer) ? answer : [answer];

        // correctAnswer in DB is a string of indices, e.g., "0" or "0,2"
        const correctIndices = questionDoc.correctAnswer.split(',').map(idx => parseInt(idx.trim()));
        const correctTexts = correctIndices.map(idx => questionDoc.options[idx]);

        const isMultiple = questionDoc.questionType === "Multiple Correct";

        if (isMultiple) {
            // All correct answers must be present and no incorrect ones
            const isCorrect = submittedAnswers.length === correctTexts.length &&
                submittedAnswers.every(ans => correctTexts.includes(ans));
            if (isCorrect) score = questionDoc.marks || 0;
        } else {
            // Single correct
            if (submittedAnswers.includes(correctTexts[0])) {
                score = questionDoc.marks || 0;
            }
        }

        let submission = await Submission.findOne({ contest: contestId, user: userId });
        if (!submission) {
            submission = new Submission({ contest: contestId, user: userId, submissions: [] });
        }

        const entry = {
            question: questionId,
            answer: Array.isArray(answer) ? answer : [answer],
            score,
            submittedAt: new Date()
        };

        const existingIdx = submission.submissions.findIndex(s => s.question.toString() === questionId);
        if (existingIdx > -1) submission.submissions[existingIdx] = entry;
        else submission.submissions.push(entry);

        submission.totalScore = submission.submissions.reduce((acc, curr) => acc + (curr.score || 0), 0);
        await submission.save();

        return res.status(200).json({ success: true, score });
    } catch (error) {
        next(error);
    }
};

module.exports = { saveMCQ, submitCode, runCode };
