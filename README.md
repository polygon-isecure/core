# ArmSocial - social network for Armenians
<br>

## Cloning the repository
```bash
git clone https://github.com/MichaelGrigoryan25/ArmSocial
```

## After cloning the repository
### Reproduce these steps
* Open the terminal and run `npm install`
* Create a `.env` file at the project's root folder
* In the `.env` file paste this line `mongo=YOUR_MONGODB_URI`
* Open up the terminal and run `npm start` or `npm run dev` in a development environment

After you've done these steps you can open `localhost:3000` in your browser.

## CSS Framework(s) Used


## Templating engine(s) Used
* EJS

## Database(s) Used
* MongoDB ( For Documents )
* MinIO ( Object Storage )
* Redis ( For Caching )

## NPM dependencies Used
```json
"dependencies": {
    "body-parser": "^1.19.0",
    "compression": "^1.7.4",
    "cookie-parser": "^1.4.5",
    "dotenv": "^8.2.0",
    "ejs": "^3.1.5",
    "email-validator": "^2.0.4",
    "express": "^4.17.1",
    "express-session": "^1.17.1",
    "minio": "^7.0.16",
    "moment": "^2.29.1",
    "mongoose": "^5.10.9",
    "multer": "^1.4.2",
    "node-fetch": "^2.6.1",
    "redis": "^3.0.2"
},
"devDependencies": {
    "nodemon": "^2.0.5"
}
```

# Mongoose models
## Account model
```js
firstName: { type: String, required: true },
lastName: { type: String, required: true },
fullName: { type: String, required: true },
email: { type: String, required: true },
password: { type: String, required: true, minlength: 8 },
bio: { type: String, required: false },
pictureUrl: { type: String, required: true },
private: { type: Boolean, required: true },
date: { type: String, required: true }
```

## Post model
```js
text: { type: String, required: true },
author: { type: String, required: true },
authorEmail: { type: String, required: true },
authorId: { type: String, required: true },
authorImage: { type: String, required: true },
datefield: { type: String, required: true }
```

<hr>

## Links
### [LICENSE](./LICENSE)