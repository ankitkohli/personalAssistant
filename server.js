//server.js

//load all dependencies
	var express  = require('express');
	var app      = express();                               // create our app with express
	var redis = require("redis"),                          // using redis db
    client = redis.createClient();	                       // redis client
    var morgan = require('morgan');                       // log requests to the console () debugging
	var bodyParser = require('body-parser');              // pull information from HTML POST ()
	var methodOverride = require('method-override');      // simulate DELETE and PUT ()
	var counterUserID = 1220;                             // random id for user
	var counterTodosId = 4322;                            // random id for tasks 
	var nodemailer = require("nodemailer");               // to send mails to user
	var path = require("path");                           // path
	var EmailTemplate = require("email-templates").EmailTemplate; // load email templates	
	var ejs = require('ejs');                                     // load ejs
	var cron = require('node-schedule');                    // cron scheduler


// configuration =================

	client.on('connect', function() {   // connection to redis server
    	console.log('connected');
	});

    app.use(express.static(__dirname + '/public'));                 // set the static files location /public/img will be /img for users
    app.use('/bower_components',  express.static(__dirname + '/bower_components')); // use js from bower components
    app.use(morgan('dev'));                                         // log every request to the console
    app.use(bodyParser.urlencoded({'extended':'true'}));            // parse application/x-www-form-urlencoded
    app.use(bodyParser.json());                                     // parse application/json
    app.use(bodyParser.json({ type: 'application/vnd.api+json' })); // parse application/vnd.api+json as json
    app.use(methodOverride());
    app.set('view engine', 'ejs');

    


    // listen (start app with node server.js) ======================================
    app.listen(8080);
    console.log("App listening on port 8080");

    // notification tracker
    // keeps track of tasks whose notification hs been sent
    var notificationSent =[];

    // cron scheduler
    /* This runs at the 15th mintue of every hour. */
    /* cron runs through all the tasks and if its due date is less than or equalt to 15 it shoots a mail to concerned 
     user .*/
	cron.scheduleJob('1 * * * * *', function(){
    	console.log('This runs at the 15th mintue of every hour.');
    	client.hgetall("userTodos", function(err, objs) {
    		for(var k in objs) {
				var task = JSON.parse(objs[k]);
				if(notificationSent.indexOf(task.id) == -1 ){ 
					var userId = task.userId; 	
					var taskDate = task.dueDate;
					var mins = 1000 * 60;
      				var selectedDate = new Date(taskDate);
       				var currentDate = new Date();
       				var dueTime = Math.round((selectedDate.getTime() - currentDate.getTime()) / mins );
       				// if due date is less than or equal to 15
       				if(dueTime > 0 && dueTime<=15){
       					
       					client.hmget("usersData",userId,function (err,obj){
							var user = JSON.parse(obj);
							var notification ={
								"user":{
									"email":user.email,
									"id":user.id,
									"task":{
										"id":task.id,
										"name":task.task,
										"dueDate":new Date (task.dueDate)
									}
								}
							};
							notificationSent.push(task.id);
							// send mail
							sendMail(notification);
						});
       				}
				}
		 	}
    	});
	});


	// template for email that has 2 options to delete or snooze the task
    var templatesDir = path.resolve(__dirname +'/public/templates') ;// load templates
    var template = new EmailTemplate(path.join(templatesDir, 'notifications'));

    
    
    // setup smtp connection
    // enter your gmail userName and password
    var smtpTransport = nodemailer.createTransport("SMTP",{
  		service: "Gmail",
   		auth: {
       		user: "<your email id>",
       		pass: "<your password>"
   		}
	});	
 
 	// function to send mail to concerned user
 	// enter your from user id here
	function sendMail (mailer){
 		template.render(mailer, function (err, results) {
 	 		if (err) {
    			return console.error(err)
  			}
 		smtpTransport.sendMail({
  			from: "<your email id>", // sender address
   			to: mailer.user.email, // comma separated list of receivers
   			subject: "Your personal Assistant", // Subject line
   			html: results.html,
   			text: results.text
		},  function(error, response){
   				if(error){
    				   console.log(error);
   				}else{
    				   console.log("Message sent: " + response.message);
   					}
			});
		});
	}

// routes ======================================================================

	// this method registers a new user into the application
	// by assigning a random user id
	app.post('/register', function(req, res) {
		var userData = req.body;
		userData.id = counterUserID++;
		client.hset('usersData',userData.id,JSON.stringify(userData));
		return res.send(200,userData.id);
	});

	// this method logsin the user who is already registered.
	// checks in the db if user id and password matches or not.
	// send relevant messages
	app.post('/signin', function(req, res) {
		var userData = req.body;
		var found= false;
		client.hgetall("usersData", function(err, objs) {
			for(var k in objs) {
				var user = JSON.parse(objs[k]);
					if(user.email == userData.email){
						found =true;
						if(user.password == userData.password){
							return res.send(200,user.id);
						}
						else{
							return res.send(403,"Password doesn't match");
						}
					}
			}
			if(!found){
				return res.send(403,"Email doesn't exists");
			}
		});
	});


    // create todo  task 
    app.post('/api/todos', function(req, res) {
        var newTodo = req.body;
        newTodo.id= counterTodosId++;
        newTodo.dueDate = new Date(newTodo.dueDate);
  		client.hset("userTodos", newTodo.id, JSON.stringify(newTodo));
		return res.send(200,newTodo.id);
    });

    // deletes a todo task when user selects this option from mail.
    // verifies if the task exists and is assigned to that specific user or not.
    app.get('/deleteTask/', function(req, res) {
	
     	task_id = req.query.task_id;
     	user_id = req.query.user_id;
     	var taskFound = false;
       	client.hmget("userTodos",task_id,function (err,obj){
			try {
       			var task = JSON.parse(obj);
       			taskFound = true;
       			if(task.userId == user_id){
       				if(client.hdel("userTodos",task_id)){
       					return res.send(200,"Task Deleted");
       				}
       			}
       			else{
       				  return res.send(403,"Invalid User");
       			}
       		}
      		catch (e) {
      			console.log("task not found");
      		}
       		if(!taskFound){
        		return res.send(403,"Task not found");
       		}
       	});

    });


     // snooze a todo task when user selects this option from mail.
    // verifies if the task exists and is assigned to that specific user or not.
    app.get('/snoozeTask/', function(req, res) {
	
     	task_id = req.query.task_id;
     	user_id = req.query.user_id;
     	var taskFound = false;
       	client.hmget("userTodos",task_id,function (err,obj){
			try {
       			var task = JSON.parse(obj);
       			taskFound = true;
       			if(task.userId == user_id){
       				var selectedDate = new Date(task.dueDate);
       				selectedDate.setDate(selectedDate.getDate() + 1);
       				task.dueDate = new Date(selectedDate);
  					if(client.hset("userTodos", task.id, JSON.stringify(task))){
  						notificationSent.splice(notificationSent.indexOf(task.id));
  						return res.send(200,"Task pushed by 1 day");
  					}
       			}
       			else{
       				  return res.send(403,"Invalid User");
       			}
       		}
      		catch (e) {
      			console.log(e);
      		}
       		if(!taskFound){
        		return res.send(403,"Task not found");
       		}
       	});

    });

    
    