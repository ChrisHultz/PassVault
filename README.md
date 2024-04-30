To get this working, you'll want to do a few things.

Open the .env file

1: Create your own Secrey Key
Using this link, you'll want to copy the randomly generated key from this site under "Encryption Key 256"
https://acte.ltd/utils/randomkeygen

2: Insert your own Mongo URL
You can create a free server at https://www.mongodb.com and you can get your server there.

3: Create your own user email.

I used GMail to do this. You will need to generate a specific password to allow the application to login.

------------------------------------------

Afterward, you'll want to install the libraries used.

    "bcrypt": "^5.1.1",
    "dotenv": "^16.4.5",
    "express": "^4.18.2",
    "express-session": "^1.18.0",
    "mongodb": "^6.3.0",
    "mongoose": "^8.2.0",
    "nodemailer": "^6.9.13",
    "passport": "^0.7.0",
    "passport-local": "^1.0.0"

I might be missing one or two, but...

After you've done all these steps, you should be able to run this on your own!
