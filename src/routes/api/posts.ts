import express from "express";
import { celebrate, Joi, Segments } from "celebrate";
import { uuidValidator } from "middleware/uuidValidator";
import { only, create, remove, ofUser } from "controllers/api/posts";

const router = express.Router();

// To fetch only one post with ID
router.get("/only/:id", uuidValidator(), only);

// To fetch posts of an account
router.get(
  "/:username",
  celebrate({
    [Segments.PARAMS]: {
      username: Joi.string()
        // Standard username regex
        .regex(/^(?=[a-zA-Z0-9._]{8,20}$)(?!.*[_.]{2})[^_.].*[^_.]$/)
        .exist(),
    },
    [Segments.QUERY]: {
      cursor: Joi.string().optional().uuid().cache(),
      limit: Joi.number().greater(2).less(10).default(2).cache(),
    },
  }),
  ofUser
);

// To delete a post
router.delete("/:id/delete", uuidValidator(), remove);

// To create a post
// prettier-ignore
router.post("/create", celebrate({
    [Segments.BODY]: {
        title: Joi.string().max(100).exist(),
        content: Joi.string().optional().default(null),
      }
    },
  ),
  create
);

export default router;
