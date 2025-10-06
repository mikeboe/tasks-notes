import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/NewAuthContext";
import { useState } from "react";
import { Loader2Icon } from "lucide-react";
import toast from "react-hot-toast";
import { useNavigate, useLocation } from "react-router-dom";
import { useMsal } from "@azure/msal-react";
import { loginRequest } from "@/lib/msal-config";

interface LoginFormProps extends React.ComponentProps<"div"> {
  resumeId?: string;
}

export function LoginForm({ className, resumeId, ...props }: LoginFormProps) {
  const { login, loginWithMicrosoft, forgotPassword } = useAuth();
  const [loading, setLoading] = useState(false);
  const [msLoading, setMsLoading] = useState(false);
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { instance } = useMsal();

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);

    const form = event.currentTarget;
    const email = (form.elements.namedItem("email") as HTMLInputElement).value;
    const password = (form.elements.namedItem("password") as HTMLInputElement).value;

    try {
      const result = await login(email, password);
      if (result.success) {
        toast.success("Login successful!");
        // Redirect to the intended page or home
        const from = location.state?.from || '/';
        navigate(from, { replace: true });
      } else {
        toast.error(result.error || "Login failed. Please try again.");
      }
    } catch (error) {
      toast.error("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    const emailInput = document.getElementById("email") as HTMLInputElement;
    const email = emailInput?.value;

    if (!email) {
      toast.error("Please enter your email address first.");
      return;
    }

    setForgotPasswordLoading(true);
    try {
      const result = await forgotPassword(email);
      if (result.success) {
        toast.success("Password reset email sent! Check your inbox.");
      } else {
        toast.error(result.error || "Failed to send reset email. Please try again.");
      }
    } catch (error) {
      toast.error("An unexpected error occurred. Please try again.");
    } finally {
      setForgotPasswordLoading(false);
    }
  };

  const handleMicrosoftLogin = async () => {
    setMsLoading(true);
    try {
      const loginResponse = await instance.loginPopup(loginRequest);

      if (loginResponse.idToken) {
        const result = await loginWithMicrosoft(loginResponse.idToken, loginResponse.accessToken);

        if (result.success) {
          toast.success("Microsoft login successful!");
          const from = location.state?.from || '/';
          navigate(from, { replace: true });
        } else {
          toast.error(result.error || "Microsoft login failed. Please try again.");
        }
      }
    } catch (error: any) {
      if (error.errorCode === "user_cancelled") {
        toast.error("Login cancelled");
      } else {
        toast.error("Microsoft login failed. Please try again.");
      }
      console.error("Microsoft login error:", error);
    } finally {
      setMsLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle>Login to your account</CardTitle>
          <CardDescription>
            Enter your email below to login to your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin}>
            <div className="flex flex-col gap-6">
              <div className="grid gap-3">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="m@example.com"
                  required
                />
              </div>
              <div className="grid gap-3">
                <div className="flex items-center">
                  <Label htmlFor="password">Password</Label>
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    disabled={forgotPasswordLoading}
                    className="ml-auto inline-block text-sm underline-offset-4 hover:underline disabled:opacity-50"
                  >
                    {forgotPasswordLoading ? "Sending..." : "Forgot your password?"}
                  </button>
                </div>
                <Input id="password" type="password" required />
              </div>
              <div className="flex flex-col gap-3">
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? <Loader2Icon className="animate-spin" /> : "Login"}
                </Button>
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">
                      Or continue with
                    </span>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={handleMicrosoftLogin}
                  disabled={msLoading || loading}
                >
                  {msLoading ? (
                    <Loader2Icon className="animate-spin mr-2" />
                  ) : (
                    <svg className="mr-2 h-4 w-4" viewBox="0 0 21 21">
                      <rect x="1" y="1" width="9" height="9" fill="#f25022"/>
                      <rect x="1" y="11" width="9" height="9" fill="#00a4ef"/>
                      <rect x="11" y="1" width="9" height="9" fill="#7fba00"/>
                      <rect x="11" y="11" width="9" height="9" fill="#ffb900"/>
                    </svg>
                  )}
                  Microsoft
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
