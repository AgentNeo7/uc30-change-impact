public with sharing class UC30_ReviewAction {
    public static Integer countRequests() { return [SELECT COUNT() FROM UC30_Review__c WITH USER_MODE]; }
}
