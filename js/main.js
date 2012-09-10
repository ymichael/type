var AppView = Backbone.View.extend({
	el: "#window",
	initialize: function(){
		this.tasks = new Tasks();
		this.render();
	},
	render: function(){
		this.tasklist = new TaskListView({
			collection: this.tasks
		});
		this.tasklist.render();
	},
	events: {
		"keypress input": "keypress"
	},
	keypress: function(e){
		if (e.keyCode == 13) {
			this.createtask();
		}
	},
	createtask: function(){
		var inputstring = this.$(".input").val();
		var task = new Task({input: inputstring});
		this.tasks.add(task);

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

	},
	render: function(){
		var hashtag = /(#[^\s]+)/g;

		var taskrawtext = this.model.get('input');
		taskrawtext = taskrawtext.replace(hashtag, "<span class='tag'>$1</span>");

		this.$el.html("<span>"+taskrawtext+"</span>");
		return this;
	}
});

var Task = Backbone.Model.extend({

});

var Tasks = Backbone.Collection.extend({
	model: Task
});

var app = new AppView();