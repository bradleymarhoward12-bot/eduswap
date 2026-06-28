import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  login as loginService,
  signup as signupService,
  describeAuthError,
} from "@/services/auth";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  BookOpen,
  Mail,
  Lock,
  User,
  ArrowRight,
  Eye,
  EyeOff,
} from "lucide-react";
import { UNIVERSITIES } from "@/config/universities";
import { validateInstitutionEmail } from "@/utils/validateInstitutionEmail";

interface AuthModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTab?: "signin" | "signup";
}

export function AuthModal({
  isOpen,
  onOpenChange,
  defaultTab = "signin",
}: AuthModalProps) {
  const { login } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"signin" | "signup">(defaultTab);

  useEffect(() => {
    if (isOpen) setActiveTab(defaultTab);
  }, [isOpen, defaultTab]);

  useEffect(() => {
    if (!isOpen) {
      resetAuthForms();
    }
  }, [isOpen]);
  const [showSigninPassword, setShowSigninPassword] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [signupEmailTouched, setSignupEmailTouched] = useState(false);
  const [signupEmailError, setSignupEmailError] = useState("");
  const [signupPasswordError, setSignupPasswordError] = useState("");
  const [signupConfirmPasswordError, setSignupConfirmPasswordError] =
    useState("");

  const [signinData, setSigninData] = useState({
    email: "",
    password: "",
  });
  const [signupData, setSignupData] = useState({
    name: "",
    email: "",
    confirmPassword: "",
    password: "",
    universityCode: "",
  });

  const resetAuthForms = () => {
    setSigninData({
      email: "",
      password: "",
    });
    setSignupData({
      name: "",
      email: "",
      confirmPassword: "",
      password: "",
      universityCode: "",
    });
    setShowSigninPassword(false);
    setShowSignupPassword(false);
    setSignupEmailTouched(false);
    setSignupEmailError("");
    setSignupPasswordError("");
    setSignupConfirmPasswordError("");
  };

  const signupDomain = signupData.universityCode
    ? (UNIVERSITIES[signupData.universityCode]?.domains[0] ?? "")
    : "";

  const validateSignupEmail = (email: string, universityCode: string) => {
    if (!universityCode) {
      return "Select your university first.";
    }

    const selectedUniversity = UNIVERSITIES[universityCode];
    const selectedDomain = selectedUniversity?.domains[0] ?? "";

    if (!validateInstitutionEmail(email, universityCode)) {
      return selectedDomain
        ? `Invalid institutional email. Must end with @${selectedDomain}.`
        : "Invalid institutional email. Please select a university and use its official email domain.";
    }

    return "";
  };

  const validateSignupPassword = (password: string) => {
    if (password.trim().length < 8) {
      return "Password must be at least 8 characters.";
    }

    return "";
  };

  const validateSignupConfirmPassword = (
    password: string,
    confirmPassword: string,
  ) => {
    if (!confirmPassword.trim()) {
      return "Confirm your password.";
    }

    if (password !== confirmPassword) {
      return "Passwords do not match.";
    }

    return "";
  };

  const normalizedSignupEmail = signupData.email.trim();
  const isSignupEmailValid =
    Boolean(signupData.universityCode) &&
    validateInstitutionEmail(normalizedSignupEmail, signupData.universityCode);
  const isSignupPasswordValid = signupData.password.trim().length >= 8;
  const isSignupConfirmPasswordValid =
    signupData.confirmPassword.trim().length > 0 &&
    signupData.confirmPassword === signupData.password;
  const isSignupFormValid =
    Boolean(signupData.universityCode) &&
    Boolean(signupData.name.trim()) &&
    isSignupEmailValid &&
    isSignupPasswordValid &&
    isSignupConfirmPasswordValid;

  const handleSignin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const { user, token } = await loginService(
        signinData.email,
        signinData.password,
      );
      login(user, token);
      resetAuthForms();
      onOpenChange(false);
      toast({
        title: "Welcome back!",
        description: `Good to see you, ${user.fullName}.`,
      });
    } catch (err) {
      toast({
        title: "Sign in failed",
        description: describeAuthError(err),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailError = validateSignupEmail(
      signupData.email,
      signupData.universityCode,
    );
    const passwordError = validateSignupPassword(signupData.password);
    const confirmPasswordError = validateSignupConfirmPassword(
      signupData.password,
      signupData.confirmPassword,
    );

    setSignupEmailTouched(true);
    setSignupEmailError(emailError);
    setSignupPasswordError(passwordError);
    setSignupConfirmPasswordError(confirmPasswordError);

    if (emailError || passwordError || confirmPasswordError) {
      toast({
        title: "Sign up failed",
        description: emailError || passwordError || confirmPasswordError,
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { user, token } = await signupService(
        signupData.name,
        normalizedSignupEmail,
        signupData.password,
        signupData.universityCode,
      );
      login(user, token);
      resetAuthForms();
      onOpenChange(false);
      toast({
        title: "Welcome to EduSwap!",
        description: "Your account has been created.",
      });
    } catch (err) {
      const message =
        err instanceof Error && err.message === "INVALID_INSTITUTIONAL_EMAIL"
          ? (() => {
              const selectedUniversity =
                UNIVERSITIES[signupData.universityCode];
              const requiredDomain = selectedUniversity?.domains[0];
              return requiredDomain
                ? `Invalid institutional email. Use your official ${selectedUniversity.name} email ending with @${requiredDomain}.`
                : "Invalid institutional email. Please select a university and use its official email domain.";
            })()
          : describeAuthError(err);

      toast({
        title: "Sign up failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent
        className="p-0 overflow-hidden w-[calc(100vw-1.5rem)] sm:max-w-lg max-h-[calc(100vh-1.5rem)] gap-0 flex flex-col"
        data-testid="auth-modal"
      >
        <DialogTitle className="sr-only">EduSwap Authentication</DialogTitle>
        <DialogDescription className="sr-only">
          Sign in or create an account to access EduSwap.
        </DialogDescription>
        <div className="flex min-h-0 flex-1 flex-col">
          {/* Header band */}
          <div className="bg-primary px-6 sm:px-8 pt-8 pb-6 text-primary-foreground">
            <div className="flex items-center gap-2.5 mb-5">
              <div className="bg-primary-foreground/15 rounded-lg p-1.5">
                <BookOpen className="h-5 w-5" />
              </div>
              <span className="font-bold text-lg tracking-tight">EduSwap</span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight leading-tight">
              {activeTab === "signin" ? "Welcome back" : "Join your campus"}
            </h2>
            <p className="text-primary-foreground/75 text-sm mt-1.5">
              {activeTab === "signin"
                ? "Sign in to access your marketplace and tutors."
                : "Create your account and start trading with peers."}
            </p>

            {/* Tab switcher inside header */}
            <div className="flex gap-1 mt-5 bg-primary-foreground/10 rounded-lg p-1">
              <button
                type="button"
                onClick={() => setActiveTab("signin")}
                data-testid="tab-signin"
                className={`flex-1 py-1.5 text-sm font-semibold rounded-md transition-all ${
                  activeTab === "signin"
                    ? "bg-primary-foreground text-primary shadow-sm"
                    : "text-primary-foreground/80 hover:text-primary-foreground"
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("signup")}
                data-testid="tab-signup"
                className={`flex-1 py-1.5 text-sm font-semibold rounded-md transition-all ${
                  activeTab === "signup"
                    ? "bg-primary-foreground text-primary shadow-sm"
                    : "text-primary-foreground/80 hover:text-primary-foreground"
                }`}
              >
                Sign Up
              </button>
            </div>
          </div>

          {/* Form area */}
          <div className="min-h-0 flex-1 overflow-y-auto px-6 sm:px-8 py-6 bg-background">
            {activeTab === "signin" ? (
              <form onSubmit={handleSignin} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="signin-email" className="text-sm font-medium">
                    Email
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="signin-email"
                      type="email"
                      placeholder="you@university.edu"
                      className="pl-9"
                      value={signinData.email}
                      onChange={(e) =>
                        setSigninData({ ...signinData, email: e.target.value })
                      }
                      required
                      data-testid="input-signin-email"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label
                      htmlFor="signin-password"
                      className="text-sm font-medium"
                    >
                      Password
                    </Label>
                    <button
                      type="button"
                      className="text-xs text-primary hover:underline font-medium"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="signin-password"
                      type={showSigninPassword ? "text" : "password"}
                      placeholder="••••••••"
                      className="pl-9 pr-9"
                      value={signinData.password}
                      onChange={(e) =>
                        setSigninData({
                          ...signinData,
                          password: e.target.value,
                        })
                      }
                      required
                      data-testid="input-signin-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSigninPassword(!showSigninPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showSigninPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full mt-2 font-semibold"
                  disabled={isLoading}
                  data-testid="btn-signin-submit"
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground animate-spin" />
                      Signing in...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      Sign In <ArrowRight className="h-4 w-4" />
                    </span>
                  )}
                </Button>

                <p className="text-center text-xs text-muted-foreground pt-1">
                  No account?{" "}
                  <button
                    type="button"
                    onClick={() => setActiveTab("signup")}
                    className="text-primary font-semibold hover:underline"
                  >
                    Sign up free
                  </button>
                </p>
              </form>
            ) : (
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="space-y-1.5">
                  <Label
                    htmlFor="signup-university"
                    className="text-sm font-medium"
                  >
                    University
                  </Label>
                  <Select
                    value={signupData.universityCode}
                    onValueChange={(value) => {
                      setSignupData({ ...signupData, universityCode: value });
                      if (signupEmailTouched || signupData.email.trim()) {
                        setSignupEmailError(
                          validateSignupEmail(signupData.email, value),
                        );
                      }
                    }}
                  >
                    <SelectTrigger
                      id="signup-university"
                      data-testid="select-signup-university"
                    >
                      <SelectValue placeholder="Select your university" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(UNIVERSITIES).map((university) => (
                        <SelectItem
                          key={university.code}
                          value={university.code}
                        >
                          {university.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="signup-name" className="text-sm font-medium">
                    Full Name
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="signup-name"
                      placeholder="Jane Smith"
                      className="pl-9"
                      value={signupData.name}
                      onChange={(e) =>
                        setSignupData({ ...signupData, name: e.target.value })
                      }
                      required
                      data-testid="input-signup-name"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="signup-email" className="text-sm font-medium">
                    University Email
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="signup-email"
                      type="email"
                      className="pl-9"
                      value={signupData.email}
                      onChange={(e) => {
                        const nextEmail = e.target.value;
                        setSignupData({ ...signupData, email: nextEmail });
                        if (signupEmailTouched || nextEmail.trim()) {
                          setSignupEmailError(
                            validateSignupEmail(
                              nextEmail,
                              signupData.universityCode,
                            ),
                          );
                        }
                      }}
                      onBlur={() => {
                        setSignupEmailTouched(true);
                        setSignupEmailError(
                          validateSignupEmail(
                            signupData.email,
                            signupData.universityCode,
                          ),
                        );
                      }}
                      required
                      data-testid="input-signup-email"
                      placeholder={
                        signupDomain
                          ? `yourname@${signupDomain}`
                          : "you@university.edu"
                      }
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {signupDomain
                      ? `Use your institutional email (e.g., yourname@${signupDomain}).`
                      : "Select your university to see the required institutional email domain."}
                  </p>
                  {signupEmailError && (
                    <p className="text-xs text-destructive">
                      {signupEmailError}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label
                    htmlFor="signup-password"
                    className="text-sm font-medium"
                  >
                    Password
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="signup-password"
                      type={showSignupPassword ? "text" : "password"}
                      placeholder="Min. 8 characters"
                      className="pl-9 pr-9"
                      value={signupData.password}
                      onChange={(e) => {
                        const nextPassword = e.target.value;
                        setSignupData({
                          ...signupData,
                          password: nextPassword,
                        });
                        setSignupPasswordError(
                          validateSignupPassword(nextPassword),
                        );
                        if (signupData.confirmPassword.trim()) {
                          setSignupConfirmPasswordError(
                            validateSignupConfirmPassword(
                              nextPassword,
                              signupData.confirmPassword,
                            ),
                          );
                        }
                      }}
                      onBlur={() => {
                        setSignupPasswordError(
                          validateSignupPassword(signupData.password),
                        );
                      }}
                      required
                      data-testid="input-signup-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSignupPassword(!showSignupPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showSignupPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  {signupPasswordError && (
                    <p className="text-xs text-destructive">
                      {signupPasswordError}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label
                    htmlFor="signup-confirm-password"
                    className="text-sm font-medium"
                  >
                    Confirm Password
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="signup-confirm-password"
                      type={showSignupPassword ? "text" : "password"}
                      placeholder="Re-enter your password"
                      className="pl-9 pr-9"
                      value={signupData.confirmPassword}
                      onChange={(e) => {
                        const nextConfirmPassword = e.target.value;
                        setSignupData({
                          ...signupData,
                          confirmPassword: nextConfirmPassword,
                        });
                        setSignupConfirmPasswordError(
                          validateSignupConfirmPassword(
                            signupData.password,
                            nextConfirmPassword,
                          ),
                        );
                      }}
                      onBlur={() => {
                        setSignupConfirmPasswordError(
                          validateSignupConfirmPassword(
                            signupData.password,
                            signupData.confirmPassword,
                          ),
                        );
                      }}
                      required
                      data-testid="input-signup-confirm-password"
                    />
                  </div>
                  {signupConfirmPasswordError && (
                    <p className="text-xs text-destructive">
                      {signupConfirmPasswordError}
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full mt-2 font-semibold"
                  disabled={isLoading || !isSignupFormValid}
                  data-testid="btn-signup-submit"
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground animate-spin" />
                      Creating account...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      Create Account <ArrowRight className="h-4 w-4" />
                    </span>
                  )}
                </Button>

                <p className="text-center text-xs text-muted-foreground pt-1">
                  Already have an account?{" "}
                  <button
                    type="button"
                    onClick={() => setActiveTab("signin")}
                    className="text-primary font-semibold hover:underline"
                  >
                    Sign in
                  </button>
                </p>
              </form>
            )}

            <p className="text-center text-[11px] text-muted-foreground mt-5 leading-relaxed">
              By continuing, you agree to EduSwap's{" "}
              <span className="text-primary font-medium cursor-pointer hover:underline">
                Terms
              </span>{" "}
              and{" "}
              <span className="text-primary font-medium cursor-pointer hover:underline">
                Privacy Policy
              </span>
              .
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
