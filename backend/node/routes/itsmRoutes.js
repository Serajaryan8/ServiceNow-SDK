import express from "express";
import { loadJson } from "../utils/loadJson.js";

const router = express.Router();

router.get("/incidents", (req, res) => res.json(loadJson("incidents.json")));
router.get("/problems", (req, res) => res.json(loadJson("problems.json")));
router.get("/change_requests", (req, res) => res.json(loadJson("change_requests.json")));
router.get("/service_requests", (req, res) => res.json(loadJson("service_requests.json")));
router.get("/users", (req, res) => res.json(loadJson("users.json")));
router.get("/cmdb_ci", (req, res) => res.json(loadJson("cmdb_ci.json")));

export default router;
