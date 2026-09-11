@IsTest
private class UC30_ReviewActionTest {
    @IsTest static void emptyOrgScope() {
        System.assertEquals(0, UC30_ReviewAction.countRequests());
    }
}
