import { Router } from "express";
import { create, remove } from "@api/controllers/upvotes";
import { uuidValidator } from "@middleware/uuidValidator";

const router = Router();

router.post("/create/:id", uuidValidator(), create);
router.delete("/remove/:id", uuidValidator(), remove);

export default router;
