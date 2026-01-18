import { NextResponse } from 'next/server';

export async function GET() {
  const bypassVerification = 
    process.env.NODE_ENV === 'development' && 
    process.env.TEST_MODE_BYPASS_VERIFICATION === 'true';
  
  const bypassSubscription = 
    process.env.NODE_ENV === 'development' && 
    process.env.TEST_MODE_BYPASS_SUBSCRIPTION === 'true';

  return NextResponse.json({
    bypassVerification,
    bypassSubscription,
    testModeEnabled: bypassVerification || bypassSubscription,
    nodeEnv: process.env.NODE_ENV,
  });
}
