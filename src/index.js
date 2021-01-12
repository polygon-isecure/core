require("dotenv").config();
const { MONGO_URI, MONGO_USER, MONGO_PASS, MONGO_CLUSTER, EXPRESS_SECRET } = process.env;

// Dependencies
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const express = require("express");
const mongoose = require("mongoose");
const port = process.env.PORT || 3001;
const bodyParser = require("body-parser");
const compression = require("compression");
const session = require("express-session");
const MongoStore = require("connect-mongo")(session);
const cookieParser = require("cookie-parser");
const app = express();

// Routes
const apiRoute = require("./routes/api");
const authRoute = require("./routes/auth");

// Middleware
app.use(
  cors({
    origin: [
      `https://${process.env.HOST_NAME}`,
      `http://${process.env.HOST_NAME}`,
      `${process.env.HOST_NAME}`
    ],
    credentials: true
  })
);
app.use(helmet());
app.use(compression());
app.use(cookieParser());
app.use(bodyParser.json());
app.use(express.static("public/"));
app.use(bodyParser.urlencoded({ extended: false }));
process.env.NODE_ENV === "development" && app.use(morgan("dev"));
app.use(
  session({
    secret: EXPRESS_SECRET,
    resave: false,
    saveUninitialized: true,
    store: new MongoStore({ mongooseConnection: mongoose.connection, dbName: "sessions" }),
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production" ? true : false
    }
  })
);

// Use the routes
app.use("/api", apiRoute);
app.use("/auth", authRoute);

// Error page
app.get("*", (_req, res) =>
  res.status(404).json({
    error: "Page Not Found"
  })
);

// Connect to MongoDB
mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useFindAndModify: false,
  dbName: MONGO_CLUSTER,
  user: MONGO_USER,
  pass: MONGO_PASS
});

mongoose.connection.once("connected", () => {
  console.log("MongoDB connection established successfully");
});

// Start the server
app.listen(port, "0.0.0.0", () => console.log(`Server started at port ${port}`));
