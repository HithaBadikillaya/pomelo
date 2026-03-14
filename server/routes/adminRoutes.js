const express = require("express");
const multer = require("multer");
const { requireAuth } = require("../middlewares/checkAuth");
const isAdmin = require("../middlewares/isAdmin");
const {
  createProblem,
  updateProblem,
  deleteQuestion,
  getProblemDetail,
  getAdminContests,
  getAdminContestDetail,
  createContest,
  cloneContest,
  updateContest,
  getAdminContestResults,
  deleteContest,
  getAdminStats,
  importQuestions,
  getAdminSubmissionDetail,
} = require("../controllers/adminCon");
const { getData, getOne } = require("../controllers/dataCon");

const router = express.Router();

// Multer config for CSV upload (memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'), false);
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});

// Questions
router.post("/questions/create", requireAuth(), isAdmin, createProblem);
router.post("/questions/import/:type", requireAuth(), isAdmin, upload.single('file'), importQuestions);
router.put("/questions/:id/edit", requireAuth(), isAdmin, updateProblem);
router.get("/questions/:id", requireAuth(), isAdmin, getProblemDetail);
router.delete("/questions/:id", requireAuth(), isAdmin, deleteQuestion);


// Contests
router.get("/tests", requireAuth(), isAdmin, getAdminContests);
router.get("/tests/:id", requireAuth(), isAdmin, getAdminContestDetail);
router.post("/tests/create", requireAuth(), isAdmin, createContest);
router.post("/tests/:id/clone", requireAuth(), isAdmin, cloneContest);
router.put("/tests/:id/edit", requireAuth(), isAdmin, updateContest);
router.delete("/tests/:id", requireAuth(), isAdmin, deleteContest);
router.get("/tests/:id/result", requireAuth(), isAdmin, getAdminContestResults);
router.get("/tests/:contestId/submissions/:submissionId", requireAuth(), isAdmin, getAdminSubmissionDetail);

// Dashboard Stats
router.get("/stats", requireAuth(), isAdmin, getAdminStats);

// Generic Data Endpoints
router.post("/data", requireAuth(), getData);
router.post("/data/one", requireAuth(), getOne);

module.exports = router;
