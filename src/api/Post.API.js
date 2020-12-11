const _ = require("lodash");
const BW = require("bad-words");
const BadWordsFilter = new BW({ placeHolder: "*" });
const sanitizeHtml = require("sanitize-html");
const linkifyUrls = require("linkify-urls");
// For deleting files
const { unlinkSync } = require("fs");
// For displaying dates
const { fromUnixTime, format } = require("date-fns");
// MinIO Configuration
const { ENDPOINT, PORT, ACCKEY, SECKEY, USESSL } = require("../../config/minio");
const mongoose = require("mongoose");
const minio = require("minio");
const MinIOClient = new minio.Client({
  endPoint: ENDPOINT,
  port: PORT,
  accessKey: ACCKEY,
  secretKey: SECKEY,
  useSSL: USESSL
});
const multer = require("multer");
const storage = multer.diskStorage({
  destination: "tmp/",
  filename: (err, file, cb) => {
    cb(null, `${file.originalname.toString()}`);
    if (err) console.error(err);
  }
});
const upload = multer({
  storage: storage
});
const router = require("express").Router();
const AccountSchema = require("../models/account");

// Fetch posts and their data
router.get("/fetch", async (req, res) => {
  let currentAccount = await AccountSchema.findOne({
    email: req.cookies.email,
    password: req.cookies.password
  });

  // Query methods
  let { accountId, postId, heart, getHearts } = req.query;

  // For checking if the post has any data or is empty
  // TODO: Check the 2nd todo in this file
  function SpecialChecks(post) {
    if (post.hearts.usersHearted.length === 0) {
      return false;
    } else {
      post.hearts.usersHearted.forEach((user) => {
        if (user.accountId == currentAccount.id) return true;
        else return false;
      });
    }
  }

  // Getting the posts from the specified account ID
  if (accountId) {
    let account = await AccountSchema.findById(accountId);
    let posts = account.posts;

    _.each(posts, async (post) => {
      post.datefield = format(fromUnixTime((await post.datefield) / 1000), "MMM d/y h:mm b");
    });

    return res.json(posts);
  }

  // Update the hearts of the post
  if (postId && heart) {
    // Author document of the post
    let postAuthor = await AccountSchema.findOne({ "posts._id": postId });
    // The post
    let post = postAuthor.posts.id(postId);
    // Checking if current account hearted the post
    let currentAccountHeartedThePost = SpecialChecks(post);

    // console.log(currentAccountHeartedThePost); TODO: This returns undefined after the 2nd click

    // If current account liked the post
    if (currentAccountHeartedThePost) {
      _.each(post.hearts.usersHearted, async (user) => {
        if (user.accountId == currentAccount.id) {
          post.hearts.numberOfHearts--;
          await post.hearts.usersHearted.pull(self);
          await postAuthor.save();
          return res.json({ info: "UNHEARTED", data: post.hearts });
        }
      });
    } else {
      post.hearts.numberOfHearts++;
      post.hearts.usersHearted.push({ accountId: currentAccount._id });
      await postAuthor.save();
      return res.json({ info: "HEARTED", data: post.hearts });
    }
  }
  // Getting the hearts from the post
  if (postId && getHearts) {
    let postAuthor = await AccountSchema.findOne({ "posts._id": postId });
    let post = postAuthor.posts.id(postId);
    let hasCurrentAccount;

    _.each(post.hearts.usersHearted, (user) => {
      if (user.accountId == currentAccount.id) {
        hasCurrentAccount = true;
      } else {
        hasCurrentAccount = false;
      }
    });

    if (hasCurrentAccount === true) {
      res.json({ info: "ALREADY_HEARTED", data: post.hearts });
    } else {
      res.json({ info: "OK", data: post.hearts });
    }
  } else {
    let posts = [];
    let datefieldUpdate = (datefield) => {
      return format(fromUnixTime(datefield / 1000), "MMM d/y h:mm b");
    };
    let otherAccounts = await AccountSchema.find({ isPrivate: false })
      .where("_id")
      .ne(currentAccount.id);

    _.each(otherAccounts, (account) => {
      _.each(account.posts, (post) => {
        post.datefield = datefieldUpdate(post.datefield);
        posts.push(post);
      });
    });

    _.each(currentAccount.posts, (post) => {
      post.datefield = datefieldUpdate(post.datefield);
      posts.push(post);
    });

    _.sortBy(posts, ["datefield"]);

    res.json(posts);
  }
});

// CREATE A POST
router.put("/create", upload.fields([{ name: "image" }, { name: "video" }]), async (req, res) => {
  let authorAccount = await AccountSchema.findOne({
    email: req.cookies.email,
    password: req.cookies.password
  });
  let author = authorAccount.fullName;
  let authorImage = authorAccount.pictureUrl;
  let authorId = authorAccount._id;
  let { q } = req.query;

  let text =
    // Sanitizing HTML to dodge XSS attacks
    sanitizeHtml(
      // Creating an HTML link for every URL
      linkifyUrls(
        // Filtering out bad words
        BadWordsFilter.clean(req.body.text),
        // Setting some attributes for our newly created HTML
        {
          attributes: { target: "_blank" }
        }
      )
    );

  if (q == "txt") {
    const Post = {
      _id: new mongoose.Types.ObjectId(),
      text: text,
      author: author,
      authorEmail: req.cookies.email,
      authorId: authorId,
      authorImage: authorImage,
      hasAttachments: false,
      datefield: Date.now()
    };

    authorAccount.posts.push(Post);
    await authorAccount.save();
    Post.datefield = format(fromUnixTime(Post.datefield / 1000), "MMM d/y h:mm b");
    res.json(Post);
  }

  if (q == "vid") {
    await MinIOClient.fPutObject(
      "local",
      `${authorAccount._id}/media/${req.files.video[0].originalname}`,
      req.files.video[0].path,
      {
        "Content-Type": req.files.video[0].mimetype
      }
    );
    const presignedUrl = await MinIOClient.presignedGetObject(
      "local",
      `${authorAccount._id}/media/${req.files.video[0].originalname}`
    );

    const Post = {
      _id: new mongoose.Types.ObjectId(),
      text: text,
      author: author,
      authorEmail: req.cookies.email,
      authorId: authorId,
      authorImage: authorImage,
      hasAttachments: true,
      attachments: {
        hasAttachedImage: false,
        hasAttachedVideo: true,
        video: {
          attachedVideo: presignedUrl,
          attachedVideoFileName: req.files.video[0].originalname.toString()
        }
      },
      datefield: Date.now()
    };

    authorAccount.posts.push(Post);
    await authorAccount.save();
    Post.datefield = format(fromUnixTime(Post.datefield / 1000), "MMM d/y h:mm b");
    res.json(Post);
    unlinkSync(`tmp/${req.files.video[0].originalname}`);
  }

  if (q == "img") {
    await MinIOClient.fPutObject(
      "local",
      `${authorAccount._id}/media/${req.files.image[0].originalname}`,
      req.files.image[0].path,
      {
        "Content-Type": req.files.image[0].mimetype
      }
    );
    const presignedUrl = await MinIOClient.presignedGetObject(
      "local",
      `${authorAccount._id}/media/${req.files.image[0].originalname}`
    );

    const Post = {
      _id: new mongoose.Types.ObjectId(),
      text: text,
      author: author,
      authorEmail: req.cookies.email,
      authorId: authorId,
      authorImage: authorImage,
      hasAttachments: true,
      attachments: {
        hasAttachedImage: true,
        hasAttachedVideo: false,
        image: {
          attachedImage: presignedUrl,
          attachedImageFileName: req.files.image[0].originalname.toString()
        }
      },
      datefield: Date.now()
    };

    authorAccount.posts.push(Post);
    await authorAccount.save();
    Post.datefield = format(fromUnixTime(Post.datefield / 1000), "MMM d/y h:mm b");
    unlinkSync(`tmp/${req.files.image[0].originalname}`);
    res.json(Post);
  }
  if (q == "imgvid") {
    await MinIOClient.fPutObject(
      "local",
      `${authorAccount._id}/media/${req.files.video[0].originalname}`,
      req.files.video[0].path,
      {
        "Content-Type": req.files.video[0].mimetype
      }
    );
    await MinIOClient.fPutObject(
      "local",
      `${authorAccount._id}/media/${req.files.image[0].originalname}`,
      req.files.image[0].path,
      {
        "Content-Type": req.files.image[0].mimetype
      }
    );
    const presignedUrlImage = await MinIOClient.presignedGetObject(
      "local",
      `${authorAccount._id}/media/${req.files.image[0].originalname}`
    );
    const presignedUrlVideo = await MinIOClient.presignedGetObject(
      "local",
      `${authorAccount._id}/media/${req.files.video[0].originalname}`
    );

    const Post = {
      _id: new mongoose.Types.ObjectId(),
      text: text,
      author: author,
      authorEmail: req.cookies.email,
      authorId: authorId,
      authorImage: authorImage,
      hasAttachments: true,
      attachments: {
        hasAttachedImage: true,
        hasAttachedVideo: true,
        video: {
          attachedVideo: presignedUrlVideo,
          attachedVideoFileName: req.files.video[0].originalname.toString()
        },
        image: {
          attachedImage: presignedUrlImage,
          attachedImageFileName: req.files.image[0].originalname.toString()
        }
      },
      datefield: Date.now()
    };

    authorAccount.posts.push(Post);
    await authorAccount.save();
    Post.datefield = format(fromUnixTime(Post.datefield / 1000), "MMM d/y h:mm b");
    res.json(Post);
    unlinkSync(`tmp/${req.files.video[0].originalname}`);
    unlinkSync(`tmp/${req.files.image[0].originalname}`);
  }
});

// DELETE A POST
router.delete("/delete", async (req, res) => {
  const { post } = req.query;
  const currentAccount = await AccountSchema.findOne({
    email: req.cookies.email,
    password: req.cookies.password
  });

  let foundPost = currentAccount.posts.id(post);
  if (foundPost.hasAttachments == true) {
    if (foundPost.attachments.hasAttachedImage == true) {
      MinIOClient.removeObject(
        "local",
        `${currentAccount._id}/media/${foundPost.attachments.image.attachedImageFileName}`,
        function (err) {
          if (err) {
            return console.log("Unable to remove object", err);
          }
        }
      );
    }
    if (foundPost.attachments.hasAttachedVideo == true) {
      MinIOClient.removeObject(
        "local",
        `${currentAccount._id}/media/${foundPost.attachments.video.attachedVideoFileName}`,
        function (err) {
          if (err) {
            return console.log("Unable to remove object", err);
          }
        }
      );
    }
    if (foundPost.attachments.hasAttachedVideo == true && foundPost.attachments.hasAttachedImage) {
      MinIOClient.removeObject(
        "local",
        `${currentAccount._id}/media/${foundPost.attachments.image.attachedImageFileName}`,
        function (err) {
          if (err) {
            return console.log("Unable to remove object", err);
          }
        }
      );
      MinIOClient.removeObject(
        "local",
        `${currentAccount._id}/media/${foundPost.attachments.image.attachedImageFileName}`,
        function (err) {
          if (err) {
            return console.log("Unable to remove object", err);
          }
        }
      );
    }

    currentAccount.posts.pull(foundPost);
    res.json({
      result: "Removed"
    });
    await currentAccount.save();
  } else {
    currentAccount.posts.pull(foundPost);
    res.json({
      result: "Removed"
    });
    await currentAccount.save();
  }
});

module.exports = router;
