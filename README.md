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
Crypto, express, express-session, mongoose, path, nodemailer

I might be missing one or two, but...

After you've done all these steps, you should be able to run this on your own!
