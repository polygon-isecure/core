const mongoose = require("mongoose");
const mongoosePaginate = require("mongoose-paginate-v2");

const Comment = new mongoose.Schema(
  {
    content: { type: String, required: true },
    post: { type: mongoose.Schema.Types.ObjectId, ref: "Post", required: true },
    timestamp: { type: Date, required: true, default: () => Date.now() },
  },
  {
    toJSON: {
      virtuals: true,
      getters: true,
    },
  }
);

// Plugins
Comment.plugin(mongoosePaginate);

module.exports = mongoose.model("Comment", Comment);
