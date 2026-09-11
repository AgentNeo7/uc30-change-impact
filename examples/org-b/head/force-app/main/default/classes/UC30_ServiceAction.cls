public with sharing class UC30_ServiceAction {
    public static Integer countRequests() { return [SELECT COUNT() FROM UC30_Service__c WITH USER_MODE]; }
}
