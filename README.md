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

References:
https://gist.github.com/vlucas/2bd40f62d20c1d49237a109d491974eb?permalink_comment_id=2964151 -- very good for node.js and encryption!!
https://www.geeksforgeeks.org/node-js-cipher-final-method/?ref=lbp (Node.js Crypto Modules)
https://www.w3schools.com/nodejs/nodejs_email.asp (Sending an email)
https://www.tutorialspoint.com/expressjs/expressjs_sessions.htm 
https://www.youtube.com/watch?v=J1qXK66k1y4&ab_channel=FullStackZach
https://www.iconpacks.net/icons/2/free-user-icon-3296-thumb.png (User Icon)
https://acte.ltd/utils/randomkeygen (Generating a random key)
