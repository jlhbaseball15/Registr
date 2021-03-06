class calendarHandler{
	constructor(divToBindTo){
		this.divToBindTo = divToBindTo;
		this.calendars = [];
		this.currCal = 0; //keeps track of the last calendar to be loaded
		this.courses = [];
		this.permutation;
		this.permutationWithFilter;
	}
	deleteCalendars(){
		this.permutation = {};
		this.permutationWithFilter = {};
		this.divToBindTo.empty();
		for(var i =0; i < this.calendars.length; i++){
			this.calendars[i].deleteMe();
		}
		this.calendars = [];
	}
	updateCalendars(){

		this.currCal=0; //reset counter
		this.deleteCalendars(); //Delete everything currently

		var self =this;
		if(this.courses.length>0){ //Run only if there is courses is actually some courses 
			this.permutation = this.createPermutation();
		}else{
			this.runOnEmpty();
			return false;
		}
		
		console.log(this.permutation);
		this.permutationWithFilter = this.checkOverlap(this.permutation);
		if(this.permutationWithFilter.length>0){
			console.log(this.permutationWithFilter);

			//UI
			self.loadMoreBtn = $(`
				<div style="
    			text-align: center;
    			padding-bottom: 20px;
				"></div>
				
			`);
			var innerHTML = $(`<button class="ui white basic button">Load more</button>`);
			self.loadMoreBtn.append(innerHTML);
			innerHTML.on("click", function(){
				self.loadMoreBtn.detach();
				self.loadMoreContent(self);
				if(self.currCal < self.permutationWithFilter.length){
					self.divToBindTo.append(self.loadMoreBtn);
				}
				
			});
			self.loadMoreContent(self);

			if(self.currCal < self.permutationWithFilter.length){
				self.divToBindTo.append(self.loadMoreBtn);
			}
			this.divToBindTo.prepend(`<h3>${this.permutationWithFilter.length} options generated</h3>`);
			this.divToBindTo.visibility({
			    once: false,
			    observeChanges: true,
			    onBottomVisible: function() {
			    	self.loadMoreBtn.detach();
			    	self.loadMoreContent(self);
			    	if(self.currCal < self.permutationWithFilter.length){
						self.divToBindTo.append(self.loadMoreBtn);
					}
			    }
		  	});
		}else{
			this.runOnEmpty();
			return false;
		}
		
		
	}
	attachRunOnEmpty(callback){
		this.runOnEmpty = callback;
	}
	//Loads more content based on last calendar loaded.
	loadMoreContent(self){
		//console.log("adding more");
		//Adds all courses up to 10 
		var amountToAdd = 10;
		for(var i =0; i < amountToAdd && self.currCal < self.permutationWithFilter.length; i++, self.currCal++){
			var calendary = new calendar(self.divToBindTo, self.currCal);
			calendary.addBaseHtml();
			//console.log("attempting to display course:"+ self.currCal);
			//console.log("displaying" + i);
			//Adds all sections of a course
			for(var j=0; j< self.permutationWithFilter[i].length; j++)
			{
				//adds to calendar the section based on the permutation
				var course = self.permutationWithFilter[i][j].course;
				var section = self.permutationWithFilter[i][j].section;
				calendary.addSection({
					"sectionMeetTimes": self.courses[course].getSectionTimes(section), 
					"section": self.courses[course].getSectionNumber(section), 
					"color" :self.courses[course].getColor(),
					"code" : self.courses[course].getCourseCode(),
					"name" : self.courses[course].getCourseName(),
					"deptName" : self.courses[course].getDeptName(section) , 
					"credits" :  self.courses[course].getCredits(section),
					"sectWeb"  : self.courses[course].getIsWeb(section),
					"courseFee" : self.courses[course].getCourseFee(section)
				});	
				
			}

			self.calendars.push(calendary);
			
		}
		

	}
	handleInputUpdate(input){

		if(input.add){
			this.addCourse(input.add, input.color, input.callback);
		}else if(input.deleteCourse){
			this.deleteCourse(input.deleteCourse);
		}else if (input.updateFilters){
			this.updateFilters();
			this.updateCalendars();
		}else if (input.updateSettings){
			
			this.updateSettings();
			this.updateCalendars();
		}
	}
	updateFilters(){
		this.filters = this.getFilters();
	}
	updateSettings(){
		this.settings = this.getSettings();
		console.log(this.settings);
	}
	addCourse(code, color, callback){
		var self = this;
		//Extract year and semester from the settings
		var category = self.settings.find(function(element) {
		  return element.name == "Categories";
		});
		var semester = self.settings.find(function(element) {
		  return element.name == "Semester";
		});
		serverGetRequest(category.val, semester.val, code, function(result){
			//console.log(category.val);
			if(!result){
				callback({"error":"serverNoResponse"});
			}else if(JSON.parse(result).error){
				callback(JSON.parse(result));
			}else if(JSON.parse(result)[0].TOTALROWS != 0 && JSON.parse(result)[0].TOTALROWS != null){
				console.log(result);
				//not empty
				var coursey = new Course();
				coursey.setRawJSON(JSON.parse(result));
				coursey.addColor(color);
				self.courses.push(coursey);
				callback({"success": coursey});
				self.updateCalendars();
			}
			else{
				//error
				callback({"error":"doesNotExist"});
			}
		});
	}

	deleteCourse(course){
		for(var i=0; i<this.courses.length; i++){
			if(this.courses[i]==course){
				this.courses.splice(i, 1);
				this.updateCalendars();
				return;
			}
		}
	}
	checkFilter(day, time){
		var self = this;
		//console.log(self.filters);
		var map ={ 
			"M" : "Monday",
			"T" : "Tuesday",
			"W" : "Wednesday",
			"R" : "Thursday",
			"F" : "Friday",
			1 : "Period 1",
			2 : "Period 2",
			3 : "Period 3",
			4 : "Period 4",
			5 : "Period 5",
			6 : "Period 6",
			7 : "Period 7",
			8 : "Period 8",
			9 : "Period 9",
			10 : "Period 10",
			11 : "Period 11",
			12 : "Period E1",
			13 : "Period E2",
			14 : "Period E3"

		};
		var result = self.filters.find(function(element) {
		  return element.name == map[day];
		});
		
		
		if(!result.val){
			return false;
		}
		var result = self.filters.find(function(element) {
		  return element.name == map[time];
		});
		//console.log(time);
		//console.log(map[time]);
		//console.log(result);
		if(!result.val){
			return false;
		}
		return true;
	}
	setCurrentYear(inputYear){
		this.currentYear = inputYear;
	}
	setCurrentSemester(inputSemester){
		this.currentSemester = inputSemester;
	}
	checkOverlap(input){
		//looping through every possible calender
		var output = [];
		var toDelete = false;
		for(var i =0; i< input.length; i++){
			//console.log("newCalender" + i);
			var hit = {};
			//looping through every course
			for(var j=0; j< input[i].length; j++){
				//console.log(input[i][j].section);
				var sectionMeetTimes = this.courses[input[i][j].course].getSectionTimes(input[i][j].section);

				//looping through every meet time
				for(var b =0; b < sectionMeetTimes.length; b++)
				{	//looping thru every day
					for(var k =0; k < sectionMeetTimes[b].meetDays.length; k++)
					{
						//looping thru every period of the meettime
						for(var l = parseInt(convertToNum(sectionMeetTimes[b].meetPeriodBegin), 10);  l < (parseInt(convertToNum(sectionMeetTimes[b].meetPeriodEnd),10)+1); l++){
							var key = " " + l + " " + convertToNum(sectionMeetTimes[b].meetDays[k]);
							//console.log(key);
							if(hit[key] || !this.checkFilter(sectionMeetTimes[b].meetDays[k], l)) {
									//console.log("hit" + key);
									toDelete=true;
							}else{
					
								hit[key] = 1;
							}
						}
					}	
				}	
			}
			if(!toDelete){
				//console.log("pushing");
				output.push(input[i]);
			}else{
				toDelete = false;
			}
		}
		//console.log(output);
		return output;
	}
	createPermutation(){
		//creates a permutation of every possible section
		//algo riddim basis - btw this sucks at like O(n^3) but it doesnt get much load
		//go to a course 
		//duplicate every current array section times, and add a section to each
		//store i,j 
		var self =this;
		var oldArray = [];
		var newArr = [];
		for(var j =0; j< self.courses[0].getNumSections(); j++){
			oldArray[j]=[{course:0,section:j}];
		}

		if(1 < self.courses.length){
			for(var i = 1; i< self.courses.length; i++){
				var newArr = [];
				for (var k = 0; k<oldArray.length; k++){
					for(var j =0; j< self.courses[i].getNumSections(); j++){
						newArr.push(oldArray[k].concat([{course:i,section:j}]));
						
					}
				}
				
				oldArray = newArr.slice();
			}
		}
		else{
			newArr = oldArray.slice();
		}
		//console.log(newArr);
		return newArr;
	}
	attachGetFilters(callback){
		this.getFilters = callback;
		this.updateFilters();
	}
	attachGetSettings(callback){
		this.getSettings = callback;
		this.updateSettings();
	}
}
//UF has late classes with special codes, this strips them and returns an integer 
function convertToNum(inputTime){
	switch(inputTime){
		case "E1":
			return 12;
		break;
		case "E2":
			return 13;
		break;
		case "E3":
			return 14;
		break;
		default: 
			return inputTime;
		break;
	}
}
//Make get note server request
function serverGetRequest(category, semester, course, callback) {
	if(course==""){
		callback(false);
	}else{
		$.ajax({
			type: "POST",
			url: "/getCourseInfo",
			data: JSON.stringify({
				"course": course,
				"category" : category,
				"semester" : semester
			}),
			success: function(data) {
				callback(data);
			},
			error: function() {
				callback(false);
			},
			contentType: 'application/json'
		});
	}
}
