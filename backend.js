const express = require('express');
const session = require('express-session'); 
const mongoose = require('mongoose');
const crypto = require('crypto');
const path = require('path');
const nodemailer = require('nodemailer');

require('dotenv').config();

const secretKey = Buffer.from(process.env.SECRET_KEY, 'hex');
const mongoURI = process.env.MONGO_URI;
const app = express();


app.use(session({
  secret: secretKey,
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false }
}));

app.use(express.static(path.join(__dirname)));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB Connected'))
  .catch(err => console.log(err));

const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  masterpassword: { type: String, required: true }
});
const User = mongoose.model('User', UserSchema);

const itemSchema = new mongoose.Schema({
  title: String,
  website: String,
  username: String,
  password: String,
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  lastUsed: Date
});

const Item = mongoose.model('Item', itemSchema);

let transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
    },
});

function encrypt(text, secretKey) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(secretKey), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

function decrypt(text, secretKey) {
  let textParts = text.split(':');
  let iv = Buffer.from(textParts.shift(), 'hex');
  console.log(`IV Length: ${iv.length}`);

  if (iv.length !== 16) {
      throw new Error('Invalid IV length');
  }
    let encryptedText = Buffer.from(textParts.join(':'), 'hex');
    let decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(secretKey), iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
}

function encryptPassword(password) {
  return encrypt(password, secretKey);
}

app.post('/decryptPassword', async (req, res) => {
  if (!req.session.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
  }

  const { itemId } = req.body;
  try {
      const item = await Item.findOne({ _id: itemId, user: req.session.userId });

      if (!item) {
          return res.status(404).json({ error: 'Item not found' });
      }
      const decryptedPassword = decrypt(item.password, secretKey);
      res.json({ decryptedPassword });
  } catch (error) {
      console.error('Decryption error:', error);
      res.status(500).json({ error: 'Failed to decrypt password', details: error.message });
  }
});

function send2FACode(req, user) {
  const twoFACode = Math.floor(100000 + Math.random() * 900000);

  req.session.twoFACode = twoFACode.toString();
  req.session.twoFACodeExpires = Date.now() + 300000;

  const mailOptions = {
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: 'Your 2FA Code',
      text: `Your 2FA code is ${twoFACode}. This code will expire in 5 minutes.`,
  };

  transporter.sendMail(mailOptions, function(error, info) {
      if (error) {
          console.log('Error sending 2FA code:', error);
      } else {
          console.log('2FA code sent: ' + info.response);
      }
  });
}

app.post('/sendAuthCode', async (req, res) => {
  if (!req.session.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
      const user = await User.findById(req.session.userId);
      if (!user) {
          return res.status(404).json({ error: 'User not found' });
      }
      const authCode = Math.floor(100000 + Math.random() * 900000);
      req.session.authCode = authCode.toString();
      req.session.authCodeExpires = Date.now() + 300000;
      const mailOptions = {
          from: process.env.EMAIL_USER,
          to: user.email,
          subject: 'Your Email Reset Authentication Code',
          text: `Your email reset authentication code is: ${authCode}.`
      };
      await transporter.sendMail(mailOptions);
      res.json({ success: true, message: 'Auth code sent to email.' });
  } catch (error) {
      console.error('Error sending auth code:', error);
      res.status(500).json({ error: 'Error sending auth code' });
  }
});

app.post('/sendAuthCodePassword', async (req, res) => {
  if (!req.session.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
      const user = await User.findById(req.session.userId);
      if (!user) {
          return res.status(404).json({ error: 'User not found' });
      }
      const authCode = Math.floor(100000 + Math.random() * 900000);
      req.session.authCode = authCode.toString();
      req.session.authCodeExpires = Date.now() + 300000;
      const mailOptions = {
          from: process.env.EMAIL_USER,
          to: user.email,
          subject: 'Your Password Reset Authentication Code',
          text: `Your password reset authentication code is: ${authCode}.`
      };
      await transporter.sendMail(mailOptions);
      res.json({ success: true, message: 'Auth code sent to email.' });
  } catch (error) {
      console.error('Error sending auth code:', error);
      res.status(500).json({ error: 'Error sending auth code' });
  }
});

app.post('/verifyAuthCode', (req, res) => {
  const { code } = req.body;
  if (req.session.authCode && req.session.authCodeExpires > Date.now()) {
      if (code.toString() === req.session.authCode.toString()) {
          res.json({ success: true, message: "Auth code verified." });
      } else {
          res.json({ success: false, message: "Incorrect auth code." });
      }
  } else {
      res.json({ success: false, message: "Auth code expired or not found." });
  }
});

app.post('/verifyAuthCodePassword', (req, res) => {
  const { code } = req.body;
  if (req.session.authCode && req.session.authCodeExpires > Date.now()) {
      if (code.toString() === req.session.authCode.toString()) {
          res.json({ success: true, message: "Auth code verified." });
      } else {
          res.json({ success: false, message: "Incorrect auth code." });
      }
  } else {
      res.json({ success: false, message: "Auth code expired or not found." });
  }
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'LoginPage.html'));
});

app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'Register.html'));
});

app.get('/logout', function(req, res) {
  req.session.destroy(function(err) {
    if(err) {
      console.log(err);
      res.status(500).send('Could not log out, please try again');
    } else {
      res.redirect('/LoginPage.html');
    }
  });
});

app.get('/getItems', async (req, res) => {
  const { sortField = 'lastUsed', sortOrder = 'desc' } = req.query;
  const sortOptions = {};
  sortOptions[sortField] = sortOrder === 'desc' ? -1 : 1;

  try {
      const items = await Item.find({ user: req.session.userId }).sort(sortOptions);
      res.send(items);
  } catch (error) {
      console.error('Error fetching items:', error);
      res.status(500).send('Error fetching items');
  }
});

app.post('/register', async (req, res) => {
  try {
    const secretKey = Buffer.from(process.env.SECRET_KEY, 'hex');
    const encryptedPassword = encrypt(req.body.password, secretKey);
    const encryptedMasterPassword = encrypt(req.body.masterpassword, secretKey);

    const newUser = new User({
      email: req.body.email,
      password: encryptedPassword,
      masterpassword: encryptedMasterPassword
    });

    await newUser.save();
    const decryptedPassword = decrypt(encryptedPassword, secretKey);
    const decryptedMasterPassword = decrypt(encryptedMasterPassword, secretKey);

    console.log('Decrypted Password:', decryptedPassword);
    console.log('Decrypted Master Password:', decryptedMasterPassword);
    res.redirect('/');
  } catch (error) {
    console.error(error);
    res.status(500).send("Error registering new user. Please try again.");
  }
});

app.post('/login', async (req, res) => {
  try {
      const { email, password } = req.body;
      const user = await User.findOne({ email });

      if (!user) {
        return res.redirect('/?error=Incorrect email or password');
    }

      const decryptedPassword = decrypt(user.password, secretKey);
      if (password === decryptedPassword) {
          console.log("Password Successful");
          req.session.userId = user._id.toString();
          res.redirect('/MasterPassword.html');
      } else {  
          return res.redirect('/?error=Incorrect email or password');
      }
  } catch (error) {
      console.error(error);
      res.status(500).send("An error occurred during login.");
  }
});

app.post('/verify-master-password', async (req, res) => {
  try {
      const userId = req.session.userId;
      const { masterpassword } = req.body;

      const user = await User.findById(userId);

      if (!user) {
          return res.status(404).send("User session not found.");
      }

      const secretKey = Buffer.from(process.env.SECRET_KEY, 'hex');
      const decryptedMasterPassword = decrypt(user.masterpassword, secretKey);

      if (masterpassword === decryptedMasterPassword) {
          send2FACode(req, user);
          res.redirect('/2FA.html');
      } else {
          return res.redirect('/MasterPassword.html?error=Incorrect Password');
      }
  } catch (error) {
      console.error(error);
      res.status(500).send("An error occurred during master password verification.");
  }
});

app.post('/verify-two-factor', async (req, res) => {
    try {
      const { TwoFactor } = req.body;

      if (req.session.twoFACode && TwoFactor === req.session.twoFACode && Date.now() < req.session.twoFACodeExpires) {
        console.log('2FA verification successful');
        req.session.twoFACode = null;
        req.session.twoFACodeExpires = null;
        res.redirect('/pwManager.html');
      }
      else {
        return res.redirect('/2FA.html?error=Invalid 2FA Code');
      }

    } catch (error) {
      console.error('An error occurred during 2FA verification:', error);
      res.status(500).send('An error occurred during 2FA verification.');
    }
});


app.post('/addItem', async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).send('You must be logged in to add items.');
  }

  try {
    const { title, website, username, password } = req.body;
    
    const encryptedPassword = encryptPassword(password);

    const newItem = new Item({
        title,
        website,
        username,
        password: encryptedPassword,
        user: req.session.userId
    });

    await newItem.save();

    res.status(201).send({ message: 'Item added successfully', item: newItem });
  } catch (error) {
    console.error(error);
    res.status(500).send('Error adding the item');
  }
});

app.post('/itemUsed', async (req, res) => {
  const { itemId } = req.body;
  try {
      const item = await Item.findByIdAndUpdate(itemId, { $set: { lastUsed: new Date() } }, { new: true });
      res.json(item);
  } catch (error) {
      console.error('Error updating last used:', error);
      res.status(500).send('Error updating item last used time');
  }
});

app.post('/updateItem', async (req, res) => {
  const { itemId, title, website, username, password } = req.body;
  try {
      const updatedItem = await Item.findByIdAndUpdate(itemId, { title, website, username, password: encryptPassword(password) }, { new: true });
      res.json(updatedItem);
  } catch (error) {
      console.error('Error updating item:', error);
      res.status(500).send('Error updating item');
  }
});

app.post('/updateLastUsed', async (req, res) => {
  const { itemId } = req.body;
  try {
    const updatedItem = await Item.findByIdAndUpdate(itemId, { $set: { lastUsed: new Date() } }, { new: true });
    res.json(updatedItem);
  } catch (error) {
    console.error('Error updating last used:', error);
    res.status(500).send('Error updating item last used time');
  }
});

app.delete('/deleteItem', async (req, res) => {
  const { itemId } = req.body;
  try {
      await Item.findByIdAndDelete(itemId);
      res.send({ message: 'Item deleted successfully' });
  } catch (error) {
      console.error('Error deleting item:', error);
      res.status(500).send('Error deleting item');
  }
});

app.post('/updateEmail', async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { newEmail } = req.body;

  try {
    if (!validateEmailFormat(newEmail)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }
    const existingUser = await User.findOne({ email: newEmail });
    if (existingUser) {
      return res.status(400).json({ error: 'Email is already in use' });
    }
    const user = await User.findById(req.session.userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    user.email = newEmail;
    await user.save();

    res.json({ success: true, message: 'Email updated successfully.' });
  } catch (error) {
    console.error('Error updating email:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.use((err, req, res, next) =>   {
    console.error(err.stack);
    res.status(500).send('Something broke.');
});

function validateEmailFormat(email) {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

app.get('/getUserEmail', async (req, res) => {
  if (!req.session.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
      const user = await User.findById(req.session.userId);
      if (!user) {
          return res.status(404).json({ error: 'User not found' });
      }
      res.json({ email: user.email });
  } catch (err) {
      console.error('Error fetching user email:', err);
      res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/updatePassword', async (req, res) => {
  if (!req.session.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
  }

  const { newPassword } = req.body;

  try {
      const user = await User.findById(req.session.userId);

      if (!user) {
          return res.status(404).json({ error: 'User not found' });
      }
      user.password = encryptPassword(newPassword);
      await user.save();

      res.json({ success: true, message: 'Password updated successfully.' });
  } catch (error) {
      console.error('Error updating password:', error);
      res.status(500).json({ error: 'Internal server error' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});