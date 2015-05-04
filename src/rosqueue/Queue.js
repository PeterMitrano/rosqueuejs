/**
 * @author Peter Mitrano - pdmitrano@wpi.edu
 */

/**
 * Communicates with rms_queue_manager node to handle users.
 * Developed to allow multiple users to visit an RMS interface to control a single robot
 * Users will be placed into a queue giving the first user control of the robot for a certain amount of time
 * When that user leaves, or their time ends, they will be kicked out and the next user gains control
 *
 * @constructor
 * @param options  - object with the following keys
 *      * ros - the ros ROSLIB.Ros connection handle
 *      * userId - the id of the user, used to distinguish users
 */
ROSQUEUE.Queue = function(options){
	options = options || {};
	
	/** roslib object used by all the publishers and subscribers*/
	this.ros = options.ros;

	/** variable to ensure enabled is only emit once*/
	this.sent_enabled = false;
	
	/** time in minutes that the study is conducted for*/
	this.studyTime = options.studyTime;

	/** user Id, which is used to uniquely identify all users*/
	this.userId = options.userId;

	var that = this;

	/** the publisher for dequeing */
	this.updateQueueClient = new ROSLIB.Service({
		ros: this.ros,
		name: '/update_queue',
		serviceType: 'rms_queue_manager/UpdateQueue'
	});

	/** the subscriber for the queue published by the rms_queue_manager*/
	this.queueSub = new ROSLIB.Topic({
		ros: this.ros,
		name: '/rms_queue',
		messageType: 'rms_queue_manager/RMSQueue'
	});
};

/**
 * publishes my id when I want to add myself
 */
ROSQUEUE.Queue.prototype.enqueue = function () {
	var studyTime = this.studyTime * 60;
	var request = new ROSLIB.ServiceRequest({
		user_id : this.userId,
		enqueue : true,
		study_time : studyTime //the rms_queue_manager node needs seconds
	});
	var that = this;
	this.updateQueueClient.callService(request,function(result){
		/**
		 * extracts user time left for a user and emits it to the interface so it can update
		 */
		that.queueSub.subscribe(function(message) {
			var i = message.queue.length;
			var time = {min:0,sec:0,active:false};

			while (i--) {
				if (that.userId === message.queue[i]['user_id']) {

					//check if first/active user
					if (i === message.queue.length){
						time.min =  Math.floor(message.queue[i]['time_left'].secs / 60);
						time.sec = message.queue[i]['time_left'].secs % 60;
						that.emit('enabled',time);
						if (!that.sent_enabled){
							that.emit('first_enabled');
						}
						that.sent_enabled = true;
					}
					
					//all other wait times are for users in queue
					else if (time.min >= 0 && time.sec >= 0){
						time.min =  Math.floor(message.queue[i]['wait_time'].secs / 60);
						time.sec = message.queue[i]['wait_time'].secs % 60;
						that.emit('time',time);
						that.emit('disabled');
					}
					return;
				}
			}

			//set interface to disabled/dequeued if you're not in the queue
			that.emit('disabled');
			that.emit('dequeue');

		});
		that.emit('enqueue');
	});
};

/**
 * publishes my id when I want to remove myself
 */
ROSQUEUE.Queue.prototype.dequeue = function () {
	var request = new ROSLIB.ServiceRequest({
		user_id : this.userId,
		enqueue : false,
		study_time : 0
	});
	var that = this;
	this.updateQueueClient.callService(request,function(result){
		that.emit('dequeue');
	});
};

ROSQUEUE.Queue.prototype.__proto__ = EventEmitter2.prototype;