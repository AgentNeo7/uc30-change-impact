@IsTest
private class UC30_ServiceActionTest {
    @IsTest static void emptyOrgScope() {
        System.assertEquals(0, UC30_ServiceAction.countRequests());
    }
}
