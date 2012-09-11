var AppView = Backbone.View.extend({
	el: "#window",
	initialize: function(){
		this.tasks = new Tasks();
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
		"keydown input": "keypress"
	},
	keypress: function(e){
		if (e.keyCode === 13) {
			this.executecommand();
		} else if (e.keyCode === 9) {
			e.preventDefault();
			this.autocomplete();
		}
	},
	autocomplete: function(){
		var inputstring = this.$(".input").val();

		// check for commands keys
		if (inputstring[0] === "+" && inputstring.length > 1) {
			if (inputstring.length < 5) {
				var isDone = true;
				var isEdit = true;
				for (var i = 0; i < inputstring.length; i++) {
					// done
					if (inputstring[i] !== "+done"[i]) {
						isDone = false;
					}

					// edit
					if (inputstring[i] !== "+edit"[i]) {
						isEdit = false;
					}
				}

				if (isDone) {
					return this.$(".input").val("+done ");
				} else if (isEdit) {
					return this.$(".input").val("+edit ");
				}
			}

			if (inputstring.length < 8) {
				// archive
				var isArchive = true;
				for (var j = 0; j < inputstring.length; j++) {
					// done
					if (inputstring[j] !== "+archive"[j]) {
						isArchive = false;
					}
				}

				if (isArchive) {
					return this.$(".input").val("+archive ");
				}
			}
		}


		// autocomplete tasks
		var tokens = inputstring.split(" ");
		if (tokens.length < 2) {
			return;
		}
		
		tokens.splice(0, 1);
		var prefix = tokens.join(" ");
	},
	executecommand: function(){
		var inputstring = this.$(".input").val();
		var tokens = inputstring.split(" ");

		var prefix, matches;
		if (tokens[0] === "+done") {
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
		} else if (tokens[0] === "+edit") {
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
		} else if (tokens[0] === "+archive") {
			matches = this.tasks.done();
			_.each(matches, function(task){
				task.archive();
			});
			
			//replace input field value
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
	}
});

var TaskView = Backbone.View.extend({
	className: "task",
	initialize: function(){
		this.on('change', this.render, this);
	},
	render: function(){
		var text = this.model.get('input');
		if (!this.model.get('parse')) {
			this.model.set('parse', this.parse(text));
		}
		this.$el.html(this.model.get('parse'));

		if (this.model.get('done')) {
			this.$el.addClass('done');
		} else {
			this.$el.removeClass('done');
		}
		return this;
	},
	parse: function(text){
		//hash tags
		var hashtag = /(#[^\s]+)/g;
		text = text.replace(hashtag, "<span class='tag'>$1</span>");

		//time
		var bytime = /\b(by\s)\b(\d{1,2}(\d{2}hrs|(\s?(am|pm))|(:?\d{2}))?)\b/g;
		text = text.replace(bytime, "<span class='date'>$1$2</span>");

		var time = /\b(\d{1,2})(\d{2}hrs|((\d{1,2})?\s?(am|pm))|(:?\d{2}))\b/g;
		text = text.replace(time, "<span class='date'>$1$2</span>");

		return text;
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