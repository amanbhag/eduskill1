var express = require('express');
var router = express.Router();
var User = require('../models/user');
var passport = require('passport');
var nodemailer = require('nodemailer');
var async = require('async');
var Course = require('../models/courses');
var path = require('path');
var fs = require('fs');
var url = require('url');
const mongoose = require('mongoose');
var multer = require('multer');
const GridFsStorage = require('multer-gridfs-storage');
const Grid = require('gridfs-stream');
const methodOverride = require('method-override');
const crypto = require('crypto');

// Appointment Schema
const Appointments = require('../models/appointment');

// Databse Setup

const MONGO = 'mongodb://root:abc123@ds259210.mlab.com:59210/panther404';
// Databse Setup
const conn = mongoose.createConnection(MONGO);

// GridFs
let gfs;
conn.once('open', () => {
  gfs = Grid(conn.db, mongoose.mongo);
  gfs.collection('uploads');
});

// Create Storage Engine
const storage = new GridFsStorage({
  url: MONGO,
  file: (req, file) => {
    return new Promise((resolve, reject) => {
      crypto.randomBytes(16, (err, buf) => {
        if (err) {
          return reject(err);
        }
        const filename = buf.toString('hex') + path.extname(file.originalname);
        const fileInfo = {
          filename: filename,
          bucketName: 'uploads'
        };
        resolve(fileInfo);
      });
    });
  }
});
const upload = multer({
  storage: storage,
  limits: { fileSize: 100000 },
  fileFilter: function(req, file, cb) {
    checkFileType(file, cb);
  }
}).single('file');

function checkFileType(file, cb) {
  const filetypes = /jpeg|jpg|png|gif/;
  const extname = filetypes.test(
    path.extname(file.originalname).toLocaleLowerCase()
  );
  const mimetype = filetypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb('Error : Please Upload Images Only');
  }
}

mongoose.connect(
  'mongodb://panther:Pappa@ds151431.mlab.com:51431/student_academy',
  (err) => {
    if (err) {
      console.log(`Unable to Connect With Database`);
    } else {
      console.log('Connected To The database');
    }
  }
); /* *********************************************************************** 
                           Email Credentials
*************************************************************************/
let transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'badboysecurities@gmail.com',
    pass: 'LaW6rXvEguCHB2V '
  }
});
/* ***********************************************************************
 *************************************************************************/

/* ***********************************************************************
                      Get Request On Main Page
*************************************************************************/
router.get('/', function(req, res, next) {
  if (req.isAuthenticated()) {
    var i = 16;
    var limit = i;
    var number = req.params.id * i - i;
    Course.find({}, (err, count) => {
      if (err) {
        res.render('error');
      } else {
        var array = [];
        for (i = 0; i < count.length; i++) {
          array.push({ name: count[i].instituteName });
        }
        Course.find({}, (err, course) => {
          if (err) {
            res.render('error');
          } else {
            if (count.length - number <= 0) {
              res.render('error');
            } else {
              i = limit;
              pageArray = [];
              var page = Math.ceil(count.length / i);
              for (i = 1; i <= page; i++) {
                pageArray.push({ number: i });
              }
              res.render('home', {
                course: course,
                array: array,
                page: pageArray
              });
            }
          }
        })
          .limit(limit)
          .skip(number);
      }
    });
  } else {
    res.render('index');
  }
});
/* ***********************************************************************
                        Ending of Main Page
*************************************************************************/

// Compare Page Routes
router.get('/compare', isLoggedIn, async (req, res) => {
  try {
    let allCourses = await Course.find();

    // Now making array of name of all institutes from the database
    var array = [];
    for (i = 0; i < allCourses.length; i++) {
      array.push({ name: allCourses[i].instituteName });
    }

    // console.log(array);

    res.render('user/compare', { array });
  } catch (err) {
    res.render('error', { error: err });
  }
});

// Route to Search Institute for compare
router.post('/searchToCompare', isLoggedIn, async (req, res) => {
  var { instituteName, instituteName2 } = req.body;
  var search = { instituteName, instituteName2 };
  try {
    // Lets find First Institute Details
    let Institute1 = await Course.find({
      $or: [{ instituteName: { $regex: search.instituteName, $options: 'i' } }]
    });
    // Lets find Second Institute Details
    let Institute2 = await Course.find({
      $or: [{ instituteName: { $regex: search.instituteName2, $options: 'i' } }]
    });

    // Counting Reviews for Institute 1
    if (Institute1[0].reviews === '1') {
      var Ins1review1 = true;
    } else if (Institute1[0].reviews === '2') {
      var Ins1review2 = true;
    } else if (Institute1[0].reviews === '3') {
      var Ins1review3 = true;
    } else if (Institute1[0].reviews === '4') {
      var Ins1review4 = true;
    } else if (Institute1[0].reviews === '5') {
      var Ins1review5 = true;
    }

    // Counting Reviews for Institute 2
    if (Institute2[0].reviews === '1') {
      var Ins2review1 = true;
    } else if (Institute2[0].reviews === '2') {
      var Ins2review2 = true;
    } else if (Institute2[0].reviews === '3') {
      var Ins2review3 = true;
    } else if (Institute2[0].reviews === '4') {
      var Ins2review4 = true;
    } else if (Institute2[0].reviews === '5') {
      var Ins2review5 = true;
    }

    res.render('user/compare', {
      Institute1,
      Institute2,
      available_course1: Institute1[0].available_course,
      available_course2: Institute2[0].available_course,
      Ins1review1,
      Ins1review2,
      Ins1review3,
      Ins1review4,
      Ins1review5,
      Ins2review1,
      Ins2review2,
      Ins2review3,
      Ins2review4,
      Ins2review5
    });
  } catch (err) {
    res.render('error', { error: err });
    console.log(err);
  }
});

/* ***********************************************************************
                        Sign Up Routes (GET & POST)
*************************************************************************/
router.get('/signup', notLoggedIn, (req, res, next) => {
  var message = req.flash('error');
  res.render('user/signup', { messages: message });
});

router.post(
  '/signup',
  notLoggedIn,
  passport.authenticate('local-signup', {
    successRedirect: '/',
    failureRedirect: '/signup',
    failureFlash: true
  })
);
/* ***********************************************************************
                      Ending Of Sign Up Routes
*************************************************************************/

/* ***********************************************************************  
                      Sign in Routes (GET & POST)
*************************************************************************/
router.get('/signin', notLoggedIn, (req, res, next) => {
  let message = req.flash('error');
  res.render('user/login', { messages: message });
});

router.post(
  '/signin',
  notLoggedIn,
  passport.authenticate('local-signin', {
    failureRedirect: '/signin',
    failureFlash: true
  }),
  function(req, res, next) {
    var mailOptions = {
      from: 'badboysecurities@gmail.com',
      to: req.user.email,
      subject: 'Login In Student Academy',
      text:
        'Hello We Are From Student Academy.You have Recently Logged with your account in Student Academy'
    };

    transporter.sendMail(mailOptions, function(error, info) {
      if (error) {
        console.log(error);
      } else {
        console.log('Email sent');
      }
    });
    res.redirect('/');
  }
);

// Forgot Route
router.get('/forgot', notLoggedIn, (req, res, next) => {
  var message = req.flash('error');
  res.render('user/forgot', { messages: message });
});

router.post('/forgot', notLoggedIn, (req, res, next) => {
  async.waterfall(
    [
      function(done) {
        crypto.randomBytes(20, function(err, buf) {
          var token = buf.toString('hex');
          done(err, token);
        });
      },
      function(token, done) {
        User.findOne({ email: req.body.email }, function(err, user) {
          if (!user) {
            req.flash('error', 'No account with that email address exists.');
            return res.redirect('/forgot');
          }

          user.resetPasswordToken = token;
          user.resetPasswordExpires = Date.now() + 10 * 60 * 1000; // 10 minutes

          user.save(function(err) {
            done(err, token, user);
          });
        });
      },
      function(token, user, done) {
        var mailOptions = {
          to: user.email,
          from: 'badboysecurities@gmail.com',
          subject: 'Node.js Password Reset',
          text:
            'You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n' +
            'Please click on the following link, or paste this into your browser to complete the process:\n\n' +
            'http://' +
            req.headers.host +
            '/reset/' +
            token +
            '\n\n' +
            'If you did not request this, please ignore this email and your password will remain unchanged.\n'
        };
        transporter.sendMail(mailOptions, function(err) {
          done(err, 'done');
        });
      }
    ],
    function(err) {
      if (err) return next(err);
      req.flash('error', 'Please Check Your Register Email For Further Info!!');
      res.redirect('/signin');
    }
  );
});

// Reset Routes are
router.get('/reset/:token', notLoggedIn, function(req, res) {
  User.findOne(
    {
      resetPasswordToken: req.params.token,
      resetPasswordExpires: { $gt: Date.now() }
    },
    function(err, user) {
      if (!user) {
        req.flash('error', 'Password reset token is invalid or has expired.');
        return res.redirect('/forgot');
      }
      res.render('user/reset', { token: req.params.token });
    }
  );
});

router.post('/reset/:token', notLoggedIn, function(req, res, next) {
  async.waterfall(
    [
      function(done) {
        User.findOne(
          {
            resetPasswordToken: req.params.token,
            resetPasswordExpires: { $gt: Date.now() }
          },
          function(err, user) {
            if (err) {
              console.log(err);
            }
            if (!user) {
              req.flash('error', 'Your Token is Expired');
              res.redirect('back');
            }
            if (user) {
              var password = req.body.password;
              user.password = user.encryptPassoword(password);
              resetPasswordToken = undefined;
              resetPasswordExpires = undefined;
              user.save((err) => {
                if (err) console.log(err);
                done(err, user);
              });
            }
          }
        );
      },
      function(user, done) {
        var mailOptions = {
          to: user.email,
          from: 'badboysecurities@gmail.com',
          subject: 'Node.js Password Reset',
          text: 'You Have Successfully Changed Your Password'
        };
        transporter.sendMail(mailOptions, function(err) {
          done(err, 'done');
        });
      }
    ],
    function(err) {
      if (err) return next(err);
      req.flash('success', 'Congo!! Your Password Has been Changed');
      res.redirect('/signin');
    }
  );
});

router.get(
  '/google',
  passport.authenticate('google', {
    scope: ['https://www.googleapis.com/auth/userinfo.profile']
  })
);

router.get('/google/callback', passport.authenticate('google'), function(
  req,
  res,
  next
) {
  res.redirect('/');
});

router.get('/logout', (req, res, next) => {
  req.logout();
  res.redirect('/');
});

router.get('/profile', isLoggedIn, (req, res, next) => {
  var message = req.flash('success');
  res.render('user/profile', { profile: req.user, message: message });
});

router.post('/profile', isLoggedIn, (req, res, next) => {
  upload(req, res, (err) => {
    if (err) {
      console.log(err);
      res.redirect('back');
    } else {
      User.findOne({ _id: req.user }, function(err, user) {
        if (err) {
          req.flash('success', 'Something Went Wrong.. Please Try Again Later');
        } else {
          user.firstname = req.body.firstname;
          user.lastname = req.body.lastname;
          user.profile = `/asset/image/${req.file.filename}`;
          user.save((err) => {
            if (err) {
              res.redirect('back');
            } else {
              req.flash('success', 'Profile Updated Successfully');
              res.redirect('/profile');
            }
          });
        }
      });
    }
  });
});

router.get('/course/:id', isLoggedIn, (req, res, next) => {
  Course.findOne({ _id: req.params.id }, function(err, course) {
    if (err) {
      res.render('error');
    }
    if (course == null) {
      res.render('error');
    } else {
      var message = req.flash('success');
      res.render('user/course', {
        id: course._id,
        message: message,
        course: course,
        list: course.available_course,
        comment: course.comment,
        url: req.headers.host + url.parse(req.url).pathname
      });
    }
  });
});

router.post('/comment/:id', isLoggedIn, (req, res, next) => {
  Course.findOne({ _id: req.params.id }, function(err, course) {
    if (err) {
      req.flash('success', 'Something Went Wrong.. Please Try Again');
      res.redirect('/course/' + req.params.id);
    } else {
      var name;
      if (req.user.firstname) {
        name = req.user.firstname;
      } else {
        name = req.user.username;
      }
      var time = new Date().toLocaleString();
      var comment = req.body.comment;
      course.comment.push({ user: name, time: time, comment: comment });
      course.save((err) => {
        if (err) {
          req.flash('success', 'Something Went Wrong.. Please Try Again');
          res.redirect('/course/' + req.params.id);
        } else {
          req.flash('success', 'Comment Added Successfully');
          res.redirect('/course/' + req.params.id);
        }
      });
    }
  });
});

router.get('/page/:id', isLoggedIn, (req, res, next) => {
  var i = 16;
  var limit = i;
  var number = req.params.id * i - i;
  Course.find({}, (err, count) => {
    if (err) {
      res.render('error');
    } else {
      var array = [];
      for (i = 0; i < count.length; i++) {
        array.push({ name: count[i].instituteName });
      }
      Course.find({}, (err, course) => {
        if (err) {
          res.render('error');
        } else {
          if (count.length - number <= 0) {
            res.render('error');
          } else {
            i = limit;
            pageArray = [];
            var page = Math.ceil(count.length / i);
            for (i = 1; i <= page; i++) {
              pageArray.push({ number: i });
            }
            res.render('home', {
              course: course,
              array: array,
              page: pageArray
            });
          }
        }
      })
        .limit(limit)
        .skip(number);
    }
  });
});

router.post('/search', isLoggedIn, (req, res, next) => {
  var search = req.body.query;
  console.log(search);
  Course.find({}, function(err, count) {
    if (err) {
      res.render('error');
    } else {
      Course.find(
        {
          $or: [
            { instituteName: new RegExp(search) },
            { courseType: new RegExp(search) }
          ]
        },
        function(err, course) {
          if (err) {
            res.render('error');
          } else {
            var array = [];
            for (i = 0; i < count.length; i++) {
              array.push({ name: count[i].instituteName });
            }
            res.render('home', { course: course, array: array });
          }
        }
      );
    }
  });
});

// Route for Booking Apointment
router.post('/appointment/:id', isLoggedIn, async (req, res) => {
  const { fullname, date, number } = req.body;
  try {
    let newApponintment = await new Appointments({
      fullname,
      date,
      number
    });

    const output = `
        <hr>
          <center><a href="http://eduskill.herokuapp.com/"></a></center>
          <h1> Student Name : ${fullname} </h1>
          <h1> Contact Number : ${number} </h1>
          <h1> Date  : ${date} </h1>
        <hr>
    `;

    // create reusable transporter object using the default SMTP transport
    let transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: 'badboysecurities@gmail.com', // EduSkill Email ID
        pass: 'LaW6rXvEguCHB2V' // EduSkill Password
      },
      tls: {
        rejectUnauthorized: false
      }
    });
    let sender = 'badboysecurities@gmail.com';
    // send mail with defined transport object
    transporter.sendMail({
      from: `"EduSkill - Toppers of Education" 👻 <contact@eduskill.com>`,
      to: 'amanbhagtani@gmail.com', // list of receivers
      subject: `You have new Appoinment from : , ${req.body.fullname}`, // Subject line
      html: output // html body
    });

    newApponintment.save();
    Course.findOne({ _id: req.params.id }, function(err, course) {
      if (err) {
        res.render('error');
      }
      if (course == null) {
        res.render('error');
      } else {
        var message = req.flash('success', 'Appointment is Booked !!');
        res.render('user/course', {
          id: course._id,
          message: message,
          course: course,
          list: course.available_course,
          comment: course.comment,
          url: req.headers.host + url.parse(req.url).pathname
        });
      }
    });

    console.log(newApponintment);
  } catch (err) {
    req.flash('success', 'Something Went Wrong.. Please Try Again');
    es.redirect('/course/' + req.params.id);
  }
});

module.exports = router;

function isLoggedIn(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect('/');
}

function notLoggedIn(req, res, next) {
  if (!req.isAuthenticated()) {
    return next();
  }
  res.redirect('/');
}
