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

	
	/** time in minutes that the study is conducted for*/
	this.studyTime = options.studyTime;

	/** user Id, which is used to uniquely identify all users*/
	this.userId = options.userId;

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

	/** the subscriber for the popFront (remove first user) published by the rms_queue_manager*/
	this.popFrontSub = new ROSLIB.Topic({
		ros: this.ros,
		name: '/rms_pop_front',
		messageType: 'std_msgs/Int32'
	});
};

/**
 * publishes my id when I want to add myself
 */
ROSQUEUE.Queue.prototype.enqueue = function () {
	var request = new ROSLIB.ServiceRequest({
		user_id : this.userId,
		enqueue : true,
		study_time : this.studyTime
	});
	var that = this;
	this.updateQueueClient.callService(request,function(result){
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