import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Key, Copy, Eye, EyeOff, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { AuthApi } from "@/lib/auth-api";

interface ApiKeyInfo {
  id: string;
  name: string;
  createdAt: string;
  lastUsed?: string;
}

export function ApiKeysSettings() {
  const [apiKey, setApiKey] = useState("");
  const [hasExistingKey, setHasExistingKey] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [isGeneratingApiKey, setIsGeneratingApiKey] = useState(false);
  const [keyInfo, setKeyInfo] = useState<ApiKeyInfo | null>(null);

  const copyToClipboard = async () => {
    if (apiKey && !hasExistingKey) {
      await navigator.clipboard.writeText(apiKey);
      toast.success("API key copied to clipboard");
    } else if (hasExistingKey) {
      toast.error("Cannot copy existing API key. Generate a new one to copy it.");
    }
  };

  const maskKey = (key: string) => {
    if (!key) return "";
    return `${key.substring(0, 8)}${'*'.repeat(24)}${key.substring(key.length - 4)}`;
  };

  const generateApiKey = async () => {
    setIsGeneratingApiKey(true);

    const result = await AuthApi.generateApiKey();

    if (result.success && result.apiKey) {
      setApiKey(result.apiKey);
      setHasExistingKey(false);
      setShowApiKey(true);
      toast.success(result.message || "API key generated successfully");
      // Fetch key info in the background but don't update UI state
      const keyInfoResult = await AuthApi.getApiKey();
      if (keyInfoResult.success && keyInfoResult.keyInfo) {
        setKeyInfo(keyInfoResult.keyInfo);
      }
    } else {
      toast.error(result.error || "Failed to generate API key");
    }

    setIsGeneratingApiKey(false);
  };

  const fetchApiKey = async () => {
    const result = await AuthApi.getApiKey();

    if (result.success && result.hasApiKey && result.keyInfo) {
      setHasExistingKey(true);
      setKeyInfo(result.keyInfo);
      setApiKey("");
      setShowApiKey(false);
    } else if (result.success && !result.hasApiKey) {
      setHasExistingKey(false);
      setKeyInfo(null);
      setApiKey("");
    }
  };

  useEffect(() => {
    fetchApiKey();
  }, []);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            API Key
          </CardTitle>
          <CardDescription>
            Use this API key to authenticate API requests. Keep it secure and don't share it.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {apiKey || hasExistingKey ? (
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Input
                  value={
                    hasExistingKey
                      ? "ak_" + "•".repeat(56) + "****"
                      : showApiKey
                      ? apiKey
                      : maskKey(apiKey)
                  }
                  disabled
                  className="font-mono text-sm"
                />
                {!hasExistingKey && apiKey && (
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setShowApiKey(!showApiKey)}
                  >
                    {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="icon"
                  onClick={copyToClipboard}
                  disabled={hasExistingKey}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>

              {keyInfo && (
                <div className="text-xs text-muted-foreground space-y-1">
                  <div>Created: {new Date(keyInfo.createdAt).toLocaleString()}</div>
                  {keyInfo.lastUsed && (
                    <div>Last used: {new Date(keyInfo.lastUsed).toLocaleString()}</div>
                  )}
                </div>
              )}

              <p className="text-xs text-muted-foreground">
                {hasExistingKey
                  ? "You have an existing API key. Generate a new one to see and copy it."
                  : "This API key has the same permissions as your user account."}
              </p>
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="flex justify-center mb-4">
                <div className="rounded-full bg-muted p-6">
                  <Key className="h-12 w-12 text-muted-foreground" />
                </div>
              </div>
              <h3 className="text-lg font-medium mb-2">No API key generated yet</h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                Generate an API key to start integrating with external applications and services.
              </p>
            </div>
          )}

          <div className="flex space-x-2">
            <Button
              onClick={generateApiKey}
              disabled={isGeneratingApiKey}
              variant={apiKey || hasExistingKey ? "outline" : "default"}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              {isGeneratingApiKey
                ? "Generating..."
                : apiKey || hasExistingKey
                ? "Regenerate API Key"
                : "Generate API Key"}
            </Button>
          </div>

          {apiKey && !hasExistingKey && (
            <div className="text-xs text-muted-foreground p-3 bg-muted rounded-md">
              <strong>Usage Example:</strong>
              <br />
              <code className="text-xs">
                curl -H "X-API-Key: {apiKey}" {window.location.origin}/api/endpoint
              </code>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Important Security Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <div className="flex gap-2">
            <div className="font-semibold min-w-[120px]">Keep it secret:</div>
            <div>Never share your API keys or commit them to version control.</div>
          </div>
          <div className="flex gap-2">
            <div className="font-semibold min-w-[120px]">Rotate regularly:</div>
            <div>Consider rotating your API keys periodically for enhanced security.</div>
          </div>
          <div className="flex gap-2">
            <div className="font-semibold min-w-[120px]">Monitor usage:</div>
            <div>Check the last used date to detect any unauthorized access.</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
