/**
 * Demandbase Data Connector CDC.1.3.1
 */

window.Dmdbase_CDC = {};

window.Dmdbase_CDC = {

   /**
    * default cookie name to store values
    */
   "cookieName": "dmdbase_cdc",
   /**
    * this is the dimension object for setting up attribute mappings
    */
   "dimensions": {},
   /**
    * Set this boolean to true to turn on console logging or use query param cdc_debug=true
    */
   "logging":false,
   /**
    * Set this boolean to true to set mbox variables
    */
   "enableTNT": true,
   /**
    * Set this boolean to true to enable the integration for TNT standard
    */
   "enableStandard": true,
   /**
    * Set this boolean to true to send attributes to analytics
    */
   "enableAnalytics": true,
   /**
    * The default value for non-company visitors that have no company values.
    */
   "DB_DEFAULT_VALUE": "ISP Visitor",
   /**
    * The default value for companies that aren't in an AW list
    */
   "NOT_IN_AWLIST": "Not In List",
   /**
    * The default value for companies in a list but have no value
    */
   "NOT_ASSIGNED_AWLIST_VALUE" : "In List No Value",

   "CompanyProfile":{},
   /**
    * Define Demandbase User Profile parameters
    */
   "targetAttributes" : ['demandbase_sid','company_name','industry','sub_industry','employee_range','revenue_range','audience','audience_segment','state','country_name','marketing_alias','b2b','b2c','web_site','watch_list_account_type','watch_list_account_status'],

   "useStorage": true,
   "useCookie": true,
   "targetReady": false,

   /**
    * Initialize variable mappings
    */
    init: function(){
     if(this.cdc_getParamByName("cdc_debug")==="true"){
       this.logging = true;
     }
   },

   /**
    *The key value pairs below represent demandbase_value:max_char_length because eVars have a 255 limit we
    *have to restrict each slot to a certain limit to not exceed 255
    *the attributes below are Demandbase API names, they cannot be mispelled
    *NOTE - the character minimum should be 11 to support ISP Visitor as default
    */
    setupDimensions:function(){

      this.dimensions.set1 =
      {
        "demandbase_sid":12,
        "company_name":40,
        "industry":40,
        "sub_industry":40,
        "employee_range":30,
        "revenue_range":30,
        "audience":30,
        "audience_segment":30

      };

      //!!!!! modify this to match what's in the UI within the Data Connector setup in Adobe
      /** Adding multiple dimension sets, upto 5 max
      this.dimensions.set2 =
      {
        "state":30,
        "country_name":30,
        "marketing_alias":30,
        "b2b":30,
        "b2c":30,
        "web_site":30,
        "watch_list_account_type":30,
        "watch_list_account_status":30
      };
      **/



   },

   /**
    * callback function for API
    * @param  {json} data
    */
    callback: function(data){

     if(!data)return;

     try{
       window.Dmdbase_CDC.init();

       data = this.flatten(data);
       window.Dmdbase_CDC.CompanyProfile = data;

       if (this.enableAnalytics){
         this.setAnalytics(window.Dmdbase_CDC.CompanyProfile);
       }

       if (this.enableTNT){
         this.setMbox(window.Dmdbase_CDC.CompanyProfile);
       }
     } catch(e){
       if(window.console && this.logging){
         console.log("DB _ " + e.message);
       }
     }
   },

   /**
    * Console function to set analytics
    */
   loadAnalytics: function(){
     this.setAnalytics(window.Dmdbase_CDC.CompanyProfile);
   },

   /**
    * @param  {json} data
    */
    setAnalytics: function(data){
      try{
        this.setupDimensions();
        if(window.sessionStorage){ //SessionStorage exists
           var standard = sessionStorage.getItem('s_dmdbase');
           var informationLevel = sessionStorage.getItem('s_dmdbase_detail');

            if(informationLevel && informationLevel==='Basic'){ //Check for existing basic ISP Visitor session
                this.storeSessionData(data); //ReSet Session data
            }
            if(!standard && this.isCookieSet(this.cookieName)){ //New browser or tab
             this.storeSessionData(data); //ReSet Session data
            }
        }
        if(!this.isCookieSet(this.cookieName)){ //First pageview only
          this.storeSessionData(data); //ReSet Session data
        }
      }
      catch(e){
       if(window.console && this.logging){
        console.log("DB _ " + e.message);
        }
      }
    },
   /**
   store the data in sessionStorage and set the Cookie
   @param {json} data
   */
   storeSessionData: function(data){
         var delimitedData = this.buildDelimitedStrings(":", data);
         if(!this.isCookieSet(this.cookieName)){
           this.saveToCookie(this.cookieName, "DBSET", 1);
         }
         Dmdbase_CDC.contextData = delimitedData;

         if(window.sessionStorage && this.useStorage){
           sessionStorage.setItem('s_dmdbase', Dmdbase_CDC.contextData[0]);
           sessionStorage.setItem('s_dmdbase_detail', data.information_level); //Add information detail to sessionStorage
           for(var i = 1; i < Dmdbase_CDC.contextData.length; i++){
              sessionStorage.setItem(('s_dmdbase_custom'+i), Dmdbase_CDC.contextData[i])
           }

         }
   },
   /**
    * @param  {json} data
    */
   setMbox: function(data){
     try{
       if(this.enableStandard){
         this.set_mbox_variables(data);
       }
       else if((window.TNT !== null) && (typeof window.TNT === "object")){
         this.set_mbox_variables(data);
       }
     }
     catch(e){
       if(window.console && this.logging){
         console.log("DB _ " + e.message);
       }
     }
   },

   /**
    * @param  {json} the data to be flattened
    * @return {json} the flattened data
    */
    flatten:function(data) {
     for (var d in data) {
       if (typeof data[d] == 'object' && data[d] !== null && data.hasOwnProperty(d)) {
         for (var nd in data[d]) {
           if(data[d].hasOwnProperty(nd)){
             data[d + '_' + nd] = data[d][nd];
           }
         }
         delete data[d];
       }
     }
     return data;
   },
   /**
    * Saves the cookie by name and assigns it value
    * @param  {string} cookieName
    * @param  {string} cookieData
    * @return {}
    */
    saveToCookie: function(cookieName, cookieData) {

     var date = new Date();
     //set to 30 minutes
     date.setTime(date.getTime() + (30 * 60 * 1000));
     var expires = "; expires=" + date.toGMTString();
     var href_url = document.location.href;
     var domain= "; domain="+this.getDomain(href_url);
     var path = "; path=/"
     document.cookie = cookieName + "=" + encodeURIComponent(cookieData) + expires + domain + path;
    },
   /**
    * Gets the cookie by its name
    * @param  {string} cookieName
    * @return {string} cookie value
    */
    getCookieByName: function(cookieName) {
      cookieName += "=";
      for (var cookieData = document.cookie.split(";"), b = 0; b < cookieData.length; b++) {
       for (var cookieValue = cookieData[b]; "\x20" == cookieValue.charAt(0);) {
         cookieValue = cookieValue.substring(1);
       }
       if (-1 != cookieValue.indexOf(cookieName)){
         return decodeURIComponent(cookieValue.substring(cookieName.length, cookieValue.length));
       }
     }
     return "";
   },
   /**
    * grabs the location.hostname from the URL using regex
    * @param  {[type]} url full URL via document.location.href
    * @return {[type]}     null or string
    */
   getHostName: function(href_url) {
     var match = href_url.match(/:\/\/(www[0-9]?\.)?(.[^/:]+)/i);
     if (match != null && match.length > 2 && typeof match[2] === 'string' && match[2].length > 0) {
       return match[2];
     }
     else {
         return null;
     }
   },
   /**
    * grabs the domain
    * @param  {[type]} url [description]
    * @return {[type]}     [description]
    */
   getDomain: function(href_url) {
     var hostName = this.getHostName(href_url);
     var domain = hostName;

     if (hostName != null) {
         var parts = hostName.split('.').reverse();

         if (parts != null && parts.length > 1) {
             domain = '.'+ parts[1] + '.' + parts[0];

             if (hostName.toLowerCase().indexOf('.co.uk') != -1 && parts.length > 2) {
               domain = '.' + parts[2] + '.' + domain;
             }
         }
     }

     return domain;
   },
   /**
    * Checks if the cookie is set by the given name
    * @param  {string} cookieName
    * @return {Boolean}
    */
    isCookieSet: function(cookieName) {
      var x = this.getCookieByName(cookieName);
      return x && x != 'undefined';
    },
   /**
    * Builds a delimited set of strings based on the values of the dimension attributes as found in the data
    * @param  {string} delimeter
    * @param  {json} data
    * @return {array} an array of values
    */
    buildDelimitedStrings: function(delimeter, data) {
     var dimensions = this.dimensions;
     var c_array = [];
     for(var set in dimensions){
       if(dimensions.hasOwnProperty(set)){
         var delimitedValues = '';
        for(var attr in dimensions[set]){
         if(dimensions[set].hasOwnProperty(attr)){
           var data_attribute="";

           if(attr.indexOf("watch_list")!=-1 && data.information_level==="Detailed" && data.hasOwnProperty(attr)){
             data_attribute = this.truthy(data[attr], this.NOT_ASSIGNED_AWLIST_VALUE);
           }
           else if(attr.indexOf("watch_list")!=-1 && data.information_level==="Detailed" && !data.hasOwnProperty(attr)){
             data_attribute = this.truthy(data[attr], this.NOT_IN_AWLIST);
           }
           else{
             data_attribute = this.truthy(data[attr],this.DB_DEFAULT_VALUE);
           }
           var max_length = dimensions[set][attr];
           data_attribute = this.resizeStr(data_attribute, max_length);
           delimitedValues +=  data_attribute + delimeter;
         }
       }
            delimitedValues = delimitedValues.substring(0, (delimitedValues.length-1)); //remove last delimeter
            delimitedValues = this.resizeStr(delimitedValues,255);
            c_array.push(delimitedValues);

          }
        }
        return c_array;

   },
   /**
    * Resizes a string based on input maxChar
    * @param  {string} the string to be resized
    * @param  {number} the maximum length
    * @return {string}
    */
    resizeStr: function(str, maxChar) {
      if(str.length > maxChar){
       str = str.substring(0, maxChar);
     }
     return str;
   },
   /**
    * Truthy checks values of data to preserve boolean values as true/false
    * @param  {string} the attribute in question
    * @param  {string} the default value if undefined/null
    * @return {string}
    */
    truthy: function(attribute, default_value) {
      return attribute || (!1 === attribute ? attribute : default_value);
    },
   /**
    * Returns the query param's value given its name
    * @param  {string} name of the query param
    * @return {value} value of query param
    */
    cdc_getParamByName: function(name) {
     name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
     var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
     results = regex.exec(location.search);
     return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
   },

     /**
      * @param  {json} the data used to set mbox variables
      */

     set_mbox_variables: function(data) {
       try {
           var profileAttrStr = '',
               delim = ',',
               builder;

           for (var key in data) {
               if (data.hasOwnProperty(key)) {
                   if (this.targetAttributes.indexOf(key) != -1) {
                     //To add prefix to User Profile parameter, append to 'profile.' (i.e. 'profile.db_')
                       var attr = 'profile.' + key + '=' + data[key] + delim;
                       profileAttrStr += attr;
                   }
               }
           }
           profileAttrStr = profileAttrStr.split(delim);


           if(this.enableStandard){
             window.targetPageParams = function() {
               return profileAttrStr;
             }
             window.targetPageParams();
             window.Dmdbase_CDC.targetReady = true;
           } else if (typeof mboxFactoryDefault !== 'undefined') {
               builder = mboxFactoryDefault.getUrlBuilder();
               builder.addParameters(profileAttrStr)
           }
       } catch (e) {
           console.log(e);
       }
     }
 };