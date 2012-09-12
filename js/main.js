// Global Commands
var COMMANDKEY = "+";
var cmds = {
	"done": "done",
	"edit": "edit",
	"archive": "archive",
	"clear": "clear"
};
_.each(cmds, function(cmd){
	cmds[cmd] = COMMANDKEY + cmd;
});


var AppView = Backbone.View.extend({
	el: "#window",
	initialize: function(){
		this.tasks = new Tasks();
		this.autocompletecollection = new Tasks();
		this.tasks.fetch();
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
		}
	},
	keyup: function(e){
		this.showautocompletesuggestions();
	},
	autocomplete: function(){
		var inputstring = this.$(".input").val();
		var tokens = inputstring.split(" ");

		// autocomplete commands keys
		if (inputstring[0] === "+" && inputstring.length > 1 && tokens.length < 2) {
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
			for (var i = 0; i < inputstring.length; i++) {
				// done
				if (inputstring[i] !== cmds['done'][i]) {
					isDone = false;
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
		var inputstring = this.$(".input").val();
		var tokens = inputstring.split(" ");

		var prefix, matches;
		if (tokens[0] === cmds['done']) {
			tokens.splice(0, 1);
			prefix = tokens.join(" ");

			matches = this.tasks.filter(function(task){
				return _(task.get('input')).startsWith(prefix);
			});

			_.each(matches, function(task){
				task.done();
			});
			
			//clear input field
			return this.$(".input").val("");
		} else if (tokens[0] === cmds["edit"]) {
			tokens.splice(0, 1);
			prefix = tokens.join(" ");

			matches = this.tasks.filter(function(task){
				return _(task.get('input')).startsWith(prefix);
			});

			
			if (matches.length !== 1) {
				// TODO
				// only can edit one.
				return;
			}

			var match = matches[0];
			
			//replace input field value
			this.$(".input").val(match.get('input'));
			
			// remove from collection
			match.destroy();
		} else if (tokens[0] === cmds["archive"]) {
			matches = this.tasks.done();
			_.each(matches, function(task){
				task.archive();
			});
			
			//replace input field value
			return this.$(".input").val("");
		} else if (tokens[0] === cmds["clear"]) {
			_.each(this.tasks.pluck("id"), function(task_id){
				this.tasks.get(task_id).archive();
			}, this);
			return this.$(".input").val("");
		} else {
			this.createtask(inputstring);
		}
	},
	createtask: function(inputstring){
		this.tasks.create({input: inputstring});

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
	initialize: function(){
		this.on('change', this.save, this);
	},
	done: function(){
		this.set("done", true);
	},
	defaults: {
		"done" : false
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
		text = text.replace(hashtag, "<span class='tag'>$1</span>");

		//time
		var bytime = /\b(by\s)\b(\d{1,2}(\d{2}hrs|(\s?(am|pm))|(:?\d{2}))?)\b/g;
		text = text.replace(bytime, "<span class='date'>$1$2</span>");

		var time = /\b((\d{2})(\d{2}hrs|((\d{2})?\s?(am|pm))|(:?\d{2}))|(\d{1})((:\d{2})|(\s?(am|pm)))|(\d{2}hrs))\b/g;
		text = text.replace(time, "<span class='date'>$1</span>");

		this.set('parse', text);
		return this.get('parse');
	}
});

var Tasks = Backbone.Collection.extend({
	model: Task,
	localStorage: new Store("type-tasks"),
	done: function(){
		return this.filter(function(task){
				return task.get('done');
		});
	}
});

//mix-in underscore string functions
_.mixin(_.string.exports());
var app = new AppView();