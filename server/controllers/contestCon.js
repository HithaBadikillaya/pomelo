const Contest = require('../models/Contest');
const User = require('../models/User');
const Question = require('../models/Question');
const { languageMap } = require('../utils/languageMap');
const { getJudge } = require('@pomelo/code-gen');

// @desc    Validate 6-digit Join ID (OTP)
// @route   POST /api/contest/validate
// @access  Public
const validateJoinId = async (req, res) => {
    try {
        const { joinId } = req.body;

        // Search the database for the 6-digit joinCode
        const contest = await Contest.findOne({ joinId: joinId });

        if (!contest) {
            return res.status(404).json({
                success: false,
                message: "Invalid Join ID. No test found with this code."
            });
        }

        // Return needed info for redirect
        return res.status(200).json({
            success: true,
            contestId: contest._id,
            title: contest.title
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Manage violations in a contest
// @route   POST /api/contests/:id/violation
// @access  Private (requires authentication)
const manageViolations = async (req, res) => {
    try {
        const { userId, details } = req.body;
        const contest = await Contest.findById(req.params.id);

        if (!contest) {
            return res.status(404).json({ message: 'Contest not found' });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Add violation logic here
        // For example, adding to a violations array in the contest model
        const violation = {
            user: userId,
            timestamp: new Date(),
            details: details || ' details provided.'
        };

        // Assuming contest schema has a 'violations' array
        if (!contest.violations) {
            contest.violations = [];
        }
        contest.violations.push(violation);

        await contest.save();

        res.json({ message: 'Violation recorded successfully', violation });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Check if test ID is valid
const checkTestId = async (req, res) => {
    try {
        const { contestId } = req.body;
        const contest = await Contest.findById(contestId);

        if (!contest) {
            return res.json({ isValid: false });
        }

        return res.json({
            isValid: true,
            contestInfo: {
                title: contest.title,
                description: contest.description
            }
        });
    } catch (error) {
        return res.json({ isValid: false });
    }
};

// @desc    Get contest landing details
const getContestLanding = async (req, res) => {
    try {
        const contest = req.contest;
        const now = new Date();
        const start = new Date(contest.startTime);
        // Check if contest is manually marked as Completed/Ended
        const status = contest.status ? contest.status.toLowerCase() : '';
        const isManuallyEnded = status === 'completed' || status === 'ended';

        const canStart = now >= start && now <= new Date(contest.endTime) && !isManuallyEnded;

        return res.json({
            success: true,
            data: {
                title: contest.title,
                description: contest.description,
                duration: contest.duration || (new Date(contest.endTime) - new Date(contest.startTime)) / 60000, // min
                startTime: contest.startTime,
                endTime: contest.endTime,
                serverTime: now,
                canStart: canStart,
                isEnded: isManuallyEnded || now > new Date(contest.endTime), // Pass ended status
                totalProblems: contest.questions.length,
                author: contest.author || "SCEM Coding Club",
                rules: contest.rules || []
            }
        });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
};

// @desc    Get contest data for attempt
const getContestData = async (req, res) => {
    try {
        const contest = req.contest;

        const questions = await require('../models/Question').find({
            _id: { $in: contest.questions }
        });

        // Fetch User Submission to get saved state
        const Submission = require('../models/Submissions');
        // Middleware likely attached submission
        const submission = req.submission || await Submission.findOne({ contest: contest._id, user: req.user.id });

        const answerMap = {}; // Map questionId -> { answer, code }
        if (submission && submission.submissions) {
            submission.submissions.forEach(s => {
                if (s.question) {
                    answerMap[s.question.toString()] = {
                        answer: s.answer,
                        code: s.code
                    };
                }
            });
        }

        const timeRemaining = Math.max(0, (new Date(contest.endTime) - new Date()) / 1000);

        return res.json({
            success: true,
            data: {
                contestId: contest._id,
                title: contest.title,
                timeRemaining,
                problems: questions.map(q => ({
                    id: q._id,
                    type: q.type, // Added type field
                    title: q.title,
                    difficulty: q.difficulty,
                    description: q.description,
                    inputFormat: q.inputFormat,
                    outputFormat: q.outputFormat,
                    constraints: q.constraints,
                    boilerplateCode: q.boilerplateCode,
                    questionType: q.questionType,
                    options: q.options,
                    marks: q.marks,
                    savedAnswer: answerMap[q._id.toString()] ? answerMap[q._id.toString()].answer : undefined,
                    savedCode: answerMap[q._id.toString()] ? answerMap[q._id.toString()].code : undefined
                }))
            }
        });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
};

// @desc    Start test (User Attempt)
const startTest = async (req, res) => {
    try {
        console.log("StartTest: Initiated");
        const contest = req.contest;
        const userId = req.user.id || req.user._id || req.user.sub;
        console.log("StartTest: User ID:", userId);

        const contestId = contest._id;
        console.log("StartTest: Contest ID:", contestId);

        const now = new Date();

        const user = await User.findById(userId);
        if (user && !user.registeredContests.includes(contestId)) {
            console.log("StartTest: Registering user for contest");
            user.registeredContests.push(contestId);
            await user.save();
        }

        // Initialize Submission if not exists
        const Submission = require('../models/Submissions');
        // Middleware might have attached submission
        let submission = req.submission;

        if (!submission) {
            submission = await Submission.findOne({ contest: contestId, user: userId });
        }

        if (!submission) {
            console.log("StartTest: Creating new submission");
            submission = new Submission({ contest: contestId, user: userId, status: 'Ongoing' });
            await submission.save();
            console.log("StartTest: Submission created:", submission._id);
        } else {
            // Middleware already checked if it was Completed and threw 403 if checkAttemptStatus was set
            console.log("StartTest: Resuming existing submission:", submission._id);
        }

        return res.json({
            success: true,
            message: 'Test started successfully',
            data: {
                contestId: contest._id,
                title: contest.title,
                timeRemaining: Math.floor((new Date(contest.endTime) - now) / 1000)
            }
        });
    } catch (error) {
        console.error("StartTest Error:", error);
        return res.status(500).json({ success: false, error: error.message });
    }
};

// @desc    Get questions for a specific test
const getTestQuestions = async (req, res) => {
    try {
        const { id: testId } = req.params;
        const contest = await Contest.findById(testId);
        if (!contest) return res.status(404).json({ success: false, error: 'Test not found' });

        const questions = await Question.find({ _id: { $in: contest.questions } });
        const questionsData = questions.map(q => ({
            id: q._id,
            type: q.type || (q.questionType === 'Coding' ? 'coding' : 'mcq'), // Normalize type
            title: q.title,
            description: q.description,
            difficulty: q.difficulty,
            marks: q.marks,
            questionType: q.questionType,
            constraints: q.constraints,
            inputFormat: q.inputFormat,
            outputFormat: q.outputFormat,
            boilerplateCode: q.boilerplateCode,
            functionName: q.functionName,
            inputVariables: q.inputVariables,
            options: q.options
        }));

        return res.json({ success: true, data: { questions: questionsData } });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
};

// @desc    List all contests
const listAllContests = async (req, res) => {
    try {
        const contests = await Contest.find({}, { _id: 1, title: 1, description: 1 });
        return res.json({ success: true, data: { contests } });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
};

// @desc    Get ranked leaderboard for a contest
// @route   GET /api/contest/:id/leaderboard
// @access  Private (Admin only)
const getLeaderboard = async (req, res) => {
    try {
        const contest = await Contest.findById(req.params.id);
        if (!contest) {
            return res.status(404).json({ success: false, message: 'Contest not found' });
        }

        const now = new Date();
        const isEnded =
            now > new Date(contest.endTime) ||
            ['completed', 'ended'].includes((contest.status || '').toLowerCase());

        if (!isEnded) {
            return res.status(403).json({
                success: false,
                message: 'Leaderboard is not available until the contest ends.'
            });
        }

        const Submission = require('../models/Submissions');

        // Include both Completed and Ongoing submissions — participants whose time
        // expired without clicking "End Test" still have valid scores.
        const submissions = await Submission.find({ contest: contest._id })
            .populate('user', 'name') // name only — no email for privacy
            .lean();

        // Sort: highest totalScore first; ties broken by earliest submittedAt
        // (Ongoing entries won't have submittedAt, so push them to the bottom of ties)
        submissions.sort((a, b) => {
            if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
            const aTime = a.submittedAt ? new Date(a.submittedAt).getTime() : Infinity;
            const bTime = b.submittedAt ? new Date(b.submittedAt).getTime() : Infinity;
            return aTime - bTime;
        });

        const leaderboard = submissions.map((sub, idx) => ({
            rank: idx + 1,
            name: sub.user ? sub.user.name || 'Anonymous' : 'Anonymous',
            totalScore: sub.totalScore ?? 0,
            submittedAt: sub.submittedAt || null,
            status: sub.status  // 'Completed' | 'Ongoing' (time expired)
        }));

        return res.status(200).json({
            success: true,
            data: {
                contestId: contest._id,
                title: contest.title,
                endTime: contest.endTime,
                totalParticipants: leaderboard.length,
                leaderboard
            }
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    End Test (Mark as Completed)
const endTest = async (req, res) => {
    try {
        console.log("EndTest: Initiated");
        const contestId = req.params.id || req.body.contestId || (req.contest && req.contest._id);
        const userId = req.user.id || req.user._id || req.user.sub;
        console.log("EndTest: Contest ID:", contestId, "User ID:", userId);

        if (!contestId) {
            console.log("EndTest: Missing Contest ID");
            return res.status(400).json({ success: false, error: 'Contest ID is required' });
        }

        const Submission = require('../models/Submissions');
        const submission = await Submission.findOne({ contest: contestId, user: userId });

        if (!submission) {
            console.log("EndTest: Submission not found");
            return res.status(404).json({ success: false, error: 'Submission session not found. Did you start the test?' });
        }

        console.log("EndTest: Marking submission as completed");
        submission.status = 'Completed';
        submission.submittedAt = new Date();
        await submission.save();

        return res.json({
            success: true,
            message: 'Test completed successfully'
        });
    } catch (error) {
        console.error("EndTest Error:", error);
        return res.status(500).json({ success: false, error: error.message });
    }
};

module.exports = {
    validateJoinId,
    manageViolations,
    checkTestId,
    getContestLanding,
    getContestData,
    getTestQuestions,
    listAllContests,
    startTest,
    endTest,
    getLeaderboard
};
