import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/NewAuthContext";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2Icon, CheckCircle, XCircle } from "lucide-react";
import toast from "react-hot-toast";

type VerificationStatus = 'loading' | 'success' | 'error' | 'expired';

export function VerifyEmailForm() {
  const [searchParams] = useSearchParams();
  const { verifyEmail, user } = useAuth();
  const [status, setStatus] = useState<VerificationStatus>('loading');
  const navigate = useNavigate();

  const token = searchParams.get("token");

  useEffect(() => {
    const performVerification = async () => {
      if (!token) {
        setStatus('error');
        return;
      }

      try {
        const result = await verifyEmail(token);
        if (result.success) {
          setStatus('success');
          toast.success("Email verified successfully!");
        } else {
          setStatus('error');
          toast.error(result.error || "Email verification failed");
        }
      } catch (error) {
        setStatus('error');
        toast.error("An unexpected error occurred during verification");
      }
    };

    performVerification();
  }, [token, verifyEmail]);

  const handleContinue = () => {
    navigate("/");
  };

  const renderContent = () => {
    switch (status) {
      case 'loading':
        return (
          <>
            <CardHeader>
              <CardTitle className="text-2xl text-center">Verifying Email</CardTitle>
              <CardDescription className="text-center">
                Please wait while we verify your email address...
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Loader2Icon className="animate-spin mx-auto mb-4" size={48} />
            </CardContent>
          </>
        );

      case 'success':
        return (
          <>
            <CardHeader>
              <CardTitle className="text-2xl text-center text-green-600">
                Email Verified!
              </CardTitle>
              <CardDescription className="text-center">
                Your email address has been successfully verified.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <CheckCircle className="text-green-600 mx-auto mb-4" size={48} />
              <p className="text-sm text-muted-foreground mb-4">
                Welcome{user?.firstName ? `, ${user.firstName}` : ''}! You can now access all features of your account.
              </p>
              <Button onClick={handleContinue} className="w-full">
                Continue to Dashboard
              </Button>
            </CardContent>
          </>
        );

      case 'error':
      default:
        return (
          <>
            <CardHeader>
              <CardTitle className="text-2xl text-center text-red-600">
                Verification Failed
              </CardTitle>
              <CardDescription className="text-center">
                {!token 
                  ? "Invalid or missing verification token."
                  : "This verification link is invalid or has expired."
                }
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <XCircle className="text-red-600 mx-auto mb-4" size={48} />
              <p className="text-sm text-muted-foreground mb-4">
                Please try requesting a new verification email or contact support if the problem persists.
              </p>
              <div className="flex flex-col gap-2">
                <Button onClick={() => navigate("/")} className="w-full">
                  Go to Dashboard
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => navigate("/login")} 
                  className="w-full"
                >
                  Back to Login
                </Button>
              </div>
            </CardContent>
          </>
        );
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <Card className="mx-auto max-w-md w-full">
        {renderContent()}
      </Card>
    </div>
  );
}