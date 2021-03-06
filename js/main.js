// Global Commands
var COMMANDKEY = ":";
var cmds = {
	"done": "done",
	"edit": "edit",
	"archive": "archive",
	"clear": "clear",
	"undo": "undo"
};
_.each(cmds, function(cmd){
	cmds[cmd] = COMMANDKEY + cmd;
});

var AppView = Backbone.View.extend({
	el: "#window",
	initialize: function(){
		this.tasks = new Tasks();
		this.autocompletecollection = new Tasks();
		this.undostack = new UndoStack(null, {tasks: this.tasks});
		this.tasks.fetch();
		this.undostack.fetch();
		this.render();
	},
	render: function(){
		this.tasklist = new TaskListView({
			collection: this.tasks
		});
		this.tasklist.render();
	},
	events: {
		"keydown input": "keydown",
		"keyup input": "keyup"
	},
	keydown: function(e){
		if (e.keyCode === 13) {
			this.executecommand();
		} else if (e.keyCode === 9) {
			e.preventDefault();
			this.autocomplete();
		} else if (e.keyCode === 32) {
			// alias commands to closest non-ambiguous command
			this.guesscommand();
		}
	},
	keyup: function(e){
		this.showautocompletesuggestions();
	},
	guesscommand: function(){
		var inputstring = this.$(".input").val();
		var tokens = inputstring.split(" ");
		var command = tokens[0];

		// if no command prefix. return early
		if (command[0] !== COMMANDKEY) {
			return;
		}

		// if command matches an existing command
		// return early
		if (command in _.values(cmds)) {
			return;
		}

		// if command matches the prefix of a command
		// replace it with the command
		var commands = _.values(cmds);
		for (var i = 0; i < commands.length; i++) {
			if (_(commands[i]).startsWith(command)) {

				// replace with command
				tokens.splice(0, 1);
				var prefix = tokens.join(" ");
				var value;
				if (prefix.length === 0) {
					value = commands[i] + prefix;
				} else {
					value = commands[i] + " " + prefix;
				}

				
				this.$(".input").val(value);
				break;
			}
		}
	},
	autocomplete: function(){
		var inputstring = this.$(".input").val();
		var tokens = inputstring.split(" ");

		// autocomplete commands keys
		if (inputstring[0] === COMMANDKEY && inputstring.length > 1 && tokens.length < 2) {
			return this.autocompletecommand(inputstring);
		}

		// autocomplete prefix
		var command = tokens[0];
		if (command === cmds['done'] || command === cmds['edit']) {
			//auto complete longest common prefix;
			tokens.splice(0, 1);
			var prefix = tokens.join(" ");

			var x;
			if (this.autocompletecollection.length === 1){
				//complete all
				x = command + " " + this.autocompletecollection.models[0].get('input');
				this.$(".input").val(x);
			} else if (this.autocompletecollection.length > 1){
				var matchstrings = this.autocompletecollection.pluck('input');

				var longestmatchingprefix = "";

				for (var i = 0; i< matchstrings[0].length; i++){
					var match = true;
					var compare = matchstrings[0].charAt(i);
					_.each(matchstrings, function(string){
						if (string.charAt(i) !== compare){
							match = false;
						}
					});

					if (!match) {
						break;
					} else {
						longestmatchingprefix += compare;
					}
				}

				x = command + " " + longestmatchingprefix;
				this.$(".input").val(x);

			}
		}
	},
	showautocompletesuggestions: function(){
		var inputstring = this.$(".input").val();
		var tokens = inputstring.split(" ");

		if (_(tokens[0]).startsWith("/")) {
			var searchterm = tokens[0];

			// filter by tags.
			var search = searchterm.substring(1);
			
			var taggedtasks = this.tasks.filter(function(task){
				var tags = task.get('tags');
				var match = false;

				for (var i = 0; i< tags.length; i++){
					if (_(tags[i]).startsWith(search)) {
						match = true;
						break;
					}
				}
				return match;
			});
			this.autocompletecollection.reset(taggedtasks);
			this.tasklist.renderautocomplete(this.autocompletecollection);
			return;
		}


		if (tokens.length === 1 || inputstring === "") {
			return this.tasklist.render();
		}

		// autocomplete tasks
		if (tokens.length > 1) {
			// check for various commands
			var command = tokens[0];
			// if match "done", "edit"
			// autocomplete
			
			tokens.splice(0, 1);
			var prefix = tokens.join(" ");

			if (command === cmds['done'] || command === cmds['edit']){
				var matches = this.tasks.filter(function(task){
					return _(task.get('input')).startsWith(prefix);
				});

				this.autocompletecollection.reset(matches);
				this.tasklist.renderautocomplete(this.autocompletecollection);
			}
		}
	},
	autocompletecommand: function(inputstring){
		if (inputstring.length < 5) {
			var isDone = true;
			var isEdit = true;
			var isUndo = true;
			for (var i = 0; i < inputstring.length; i++) {
				// done
				if (inputstring[i] !== cmds['done'][i]) {
					isDone = false;
				}

				// undo
				if (inputstring[i] !== cmds['undo'][i]) {
					isUndo = false;
				}

				// edit
				if (inputstring[i] !== cmds['edit'][i]) {
					isEdit = false;
				}
			}

			if (isDone) {
				return this.$(".input").val(cmds['done'] + " ");
			} else if (isEdit) {
				return this.$(".input").val(cmds['edit'] + " ");
			} else if (isUndo) {
				return this.$(".input").val(cmds['undo'] + " ");
			}
		}

		if (inputstring.length < 6) {
			var isClear = true;
			for (var k = 0; k < inputstring.length; k++) {
				// done
				if (inputstring[k] !== cmds['clear'][k]) {
					isClear = false;
				}
			}

			if (isClear) {
				return this.$(".input").val(cmds['clear'] + " ");
			}
		}

		if (inputstring.length < 8) {
			// archive
			var isArchive = true;
			for (var j = 0; j < inputstring.length; j++) {
				// done
				if (inputstring[j] !== cmds['archive'][j]) {
					isArchive = false;
				}
			}

			if (isArchive) {
				return this.$(".input").val(cmds['archive'] + " ");
			}
		}
	},
	executecommand: function(){
		// guess command
		this.guesscommand();

		var inputstring = this.$(".input").val();
		var tokens = inputstring.split(" ");

		var prefix, matches, undo;
		if (tokens[0] === cmds['done']) {
			tokens.splice(0, 1);
			prefix = tokens.join(" ");

			matches = this.tasks.filter(function(task){
				return _(task.get('input')).startsWith(prefix);
			});

			if (matches.length > 0) {
				matches[0].done();

				// add to undo stack
				this.undostack.create({
					type: "done",
					task: matches[0].id
				});
			}
			
			//clear input field
			return this.$(".input").val("");
		} else if (tokens[0] === cmds["edit"]) {
			tokens.splice(0, 1);
			prefix = tokens.join(" ");

			matches = this.tasks.filter(function(task){
				return _(task.get('input')).startsWith(prefix);
			});

			if (matches.length === 0) {
				return;
			}

			var match = matches[0];
			
			//replace input field value
			this.$(".input").val(match.get('input'));
			
			// add to undo stack
			this.undostack.create({
				type: "edit",
				task: match.toJSON()
			});

			// remove from collection
			match.destroy();
		} else if (tokens[0] === cmds["archive"]) {
			if (tokens.length === 1) {
				matches = this.tasks.done();
			
				// add to undo stack
				this.undostack.create({
					type: "archive",
					tasks: _.map(matches, function(match){
						return match.toJSON();
					})
				});

				_.each(matches, function(task){
					task.archive();
				});
			} else {
				//todo.
			}
			//replace input field value
			return this.$(".input").val("");
		} else if (tokens[0] === cmds["clear"]) {
			_.each(this.tasks.pluck("id"), function(task_id){
				this.tasks.get(task_id).archive();
			}, this);

			_.each(this.undostack.pluck("id"), function(undo_id){
				this.undostack.get(undo_id).destroy();
			}, this);
			return this.$(".input").val("");
		} else if (tokens[0] === cmds["undo"]) {
			this.undostack.undo();
			return this.$(".input").val("");
		} else {
			this.createtask(inputstring);
		}
	},
	createtask: function(inputstring){
		var task = this.tasks.create({
			input: inputstring
		}, {silent: true});
		this.tasks.sort();

		// add to undo stack
		console.log(this.undostack.pluck('type'));
		
		var model = new Undo({
			type: "add",
			task: task.id
		});
		this.undostack.create(model);

		//clear input field
		this.$(".input").val("");
	}
});

var TaskListView = Backbone.View.extend({
	el: "#tasks",
	initialize: function(){
		this.collection.on('all', this.render, this);
	},
	render: function(){
		if (this.collection.length === 0) {
			this.$el.html("<div class='task center'>no tasks.</div>");
		} else {
			var fragment = document.createDocumentFragment();
			this.collection.each(function(task){
				var taskview = new TaskView({model: task});
				fragment.appendChild(taskview.render().el);
			});
			this.$el.html(fragment);
		}
		return this;
	},
	renderautocomplete: function(collection){
		if (collection.length === 0) {
			this.$el.html("<div class='task center'>no tasks.</div>");
		} else {
			var fragment = document.createDocumentFragment();
			collection.each(function(task, index){
				var taskview = new TaskView({model: task});
				fragment.appendChild(taskview.render().el);
				
				if (index === 0){
					taskview.highlight();
				}
			});
			this.$el.html(fragment);
		}
		return this;
	}
});

var TaskView = Backbone.View.extend({
	className: "task",
	initialize: function(){
		this.on('change', this.render, this);
		_.bindAll(this, 'render');
	},
	render: function(){
		this.$el.html(this.model.parsed());

		if (this.model.get('done')) {
			this.$el.addClass('done');
		} else {
			this.$el.removeClass('done');
		}
		return this;
	},
	events: {
		"click" : "toggle"
	},
	toggle: function(){
		this.model.toggle();
	},
	highlight: function(){
		this.$el.addClass("highlight");
	}
});

var Task = Backbone.Model.extend({
	localStorage: new Store("type-tasks"),
	initialize: function(){
		this.on('change', this.save, this);
	},
	done: function(){
		this.set("done", true);
	},
	defaults: {
		"done": false,
		"priority": 0
	},
	archive: function(){
		this.destroy();
	},
	toggle: function(){
		this.set("done", !this.get("done"));
	},
	parsed: function(){
		if (this.get('parse')) {
			return this.get('parse');
		}

		var text = this.get('input');

		//hash tags
		var hashtag = /(#[^\s]+)/g;
		
		var hash = /#([^\s]+)/g;
		
		var tags = [];
		var match = hash.exec(text);
		while (match !== null) {
			var tag = match[1];
			tags.push(tag);
			match = hash.exec(text);
		}
		
		this.set({'tags': tags});
		text = text.replace(hashtag, "<span class='tag'>$1</span>");

		//time
		var bytime = /\b(by\s)\b(\d{1,2}(\d{2}hrs|(\s?(am|pm))|(:?\d{2}))?)\b/g;
		text = text.replace(bytime, "<span class='date'>$1$2</span>");

		var time = /\b((\d{2})(\d{2}hrs|((\d{2})?\s?(am|pm))|(:?\d{2}))|(\d{1})((:\d{2})|(\s?(am|pm)))|(\d{2}hrs))\b/g;
		text = text.replace(time, "<span class='date'>$1</span>");

		//date
		var date = /\b(\d{1,2}(\/\d{1,2}|\s(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|january|february|march|april|june|july|august|september|october|november|december))(\s\d{2}(\d{2})?)?)\b/g;
		text = text.replace(date, "<span class='date'>$1</span>");
		
		//priority
		var minus = /\s(-\d+)$/;
		var plus = /\s(\+\d+)$/;
		var lowpriority = minus.exec(text);
		var highpriority = plus.exec(text);
		text = text.replace(minus, "<span class='minus'> $1</span>");
		text = text.replace(plus, "<span class='plus'> $1</span>");

		if (lowpriority) {
			this.set({
				'priority': parseInt(lowpriority[1], 10)
			});
		} else if (highpriority) {
			this.set({
				'priority': parseInt(highpriority[1], 10)
			});
		}


		this.set('parse', text);
		return this.get('parse');
	}
});

var Tasks = Backbone.Collection.extend({
	model: Task,
	localStorage: new Store("type-tasks"),
	comparator: function(task){
		return -task.get('priority');
	},
	done: function(){
		return this.filter(function(task){
				return task.get('done');
		});
	}
});

var Undo = Backbone.Model.extend({
	localStorage: new Store("type-undostack")
});

var UndoStack = Backbone.Collection.extend({
	initialize: function(models, options){
		this.tasks = options.tasks;
	},
	localStorage: new Store("type-undostack"),
	model: Undo,
	undo: function(){
		if (this.length === 0) {
			return;
		}

		var lastaction = this.pop();
		var type = lastaction.get('type');
		if (type === "add") {
			var taskadded = this.tasks.get(lastaction.get('task'));
			var previous = this.at(this.length - 1);
			if (previous && previous.get('type') === 'edit') {
				var editedtask = this.pop();
				var x = new Task(editedtask.get('task'));
				x.save();
				this.tasks.add(x);
				editedtask.destroy();
			}

			taskadded.destroy();
		} else if (type === "archive") {
			var tasks = lastaction.get('tasks');
			_.each(tasks, function(task){
				var x = new Task(task);
				x.save();
				this.tasks.add(x);
			}, this);
		} else if (type === "done") {
			var taskdone = this.tasks.get(lastaction.get('task'));
			taskdone.toggle();
		} else if (type === "edit") {
			var y = new Task(lastaction.get('task'));
			y.save();
			this.tasks.add(y);
		}

		//remove model from local storage
		lastaction.destroy();
	}
});


//mix-in underscore string functions
_.mixin(_.string.exports());
var app = new AppView();