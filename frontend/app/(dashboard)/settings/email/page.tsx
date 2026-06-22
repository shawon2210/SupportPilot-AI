"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Mail, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export default function EmailSettingsPage() {
  const [host, setHost] = useState("");
  const [port, setPort] = useState("587");
  const [user, setUser] = useState("");
  const [password, setPassword] = useState("");
  const [fromEmail, setFromEmail] = useState("support@supportpilot.ai");
  const [fromName, setFromName] = useState("SupportPilot AI");

  const handleSave = () => {
    toast.success("Email settings saved (update .env file for production)");
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 sm:px-6 py-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Email Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configure SMTP to send AI-drafted replies to customer emails.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-emerald-500" />
            <div>
              <CardTitle>SMTP Configuration</CardTitle>
              <CardDescription>Outbound email server settings</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2 space-y-2">
              <Label htmlFor="host">SMTP Host</Label>
              <Input id="host" value={host} onChange={(e) => setHost(e.target.value)} placeholder="smtp.sendgrid.net" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="port">Port</Label>
              <Input id="port" value={port} onChange={(e) => setPort(e.target.value)} placeholder="587" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="user">Username</Label>
            <Input id="user" value={user} onChange={(e) => setUser(e.target.value)} placeholder="apikey" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fromEmail">From Email</Label>
              <Input id="fromEmail" value={fromEmail} onChange={(e) => setFromEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fromName">From Name</Label>
              <Input id="fromName" value={fromName} onChange={(e) => setFromName(e.target.value)} />
            </div>
          </div>
          <Button onClick={handleSave}>Save Settings</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Info className="h-5 w-5 text-blue-500" />
            <div>
              <CardTitle>Inbound Email</CardTitle>
              <CardDescription>Webhook endpoint for email providers</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p className="text-muted-foreground">
            Configure your email provider (SendGrid, Mailgun, SES) to forward inbound emails to:
          </p>
          <code className="block rounded-md bg-muted px-3 py-2 text-xs font-mono break-all">
            POST /api/v1/workspaces/&lt;workspace_id&gt;/ingest/email
          </code>
          <p className="text-muted-foreground">
            The email will create a new chat ticket in AI+Human mode. If SMTP is configured,
            the AI will draft an automated reply.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
