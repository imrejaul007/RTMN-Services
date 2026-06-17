'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import {
  User,
  Key,
  Bell,
  Link2,
  Palette,
  Shield,
  Save,
  RefreshCw,
  Check
} from 'lucide-react'

export default function SettingsPage() {
  const [apiKey, setApiKey] = useState('')
  const [saved, setSaved] = useState(false)
  const [integrations, setIntegrations] = useState({
    hubspot: { connected: true, apiKey: 'hs_****' },
    salesforce: { connected: false },
    slack: { connected: true },
    zoom: { connected: false }
  })

  const handleSave = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Configure your SalesMind preferences and integrations
        </p>
      </div>

      <Tabs defaultValue="integrations" className="w-full">
        <TabsList>
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="integrations" className="flex items-center gap-2">
            <Link2 className="h-4 w-4" />
            Integrations
          </TabsTrigger>
          <TabsTrigger value="api" className="flex items-center gap-2">
            <Key className="h-4 w-4" />
            API Keys
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Notifications
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Profile Settings</CardTitle>
              <CardDescription>Manage your account information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input id="name" defaultValue="John Smith" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" defaultValue="john@company.com" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="company">Company</Label>
                <Input id="company" defaultValue="Acme Corp" />
              </div>
              <Button onClick={handleSave}>
                {saved ? <Check className="mr-2 h-4 w-4" /> : <Save className="mr-2 h-4 w-4" />}
                {saved ? 'Saved' : 'Save Changes'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integrations" className="mt-6">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                    <span className="text-orange-500 font-bold">HS</span>
                  </div>
                  <div>
                    <CardTitle className="text-base">HubSpot</CardTitle>
                    <CardDescription>CRM Integration</CardDescription>
                  </div>
                </div>
                <Switch checked={integrations.hubspot.connected} />
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Connected as {integrations.hubspot.apiKey}
                </p>
                <Button variant="outline" size="sm" className="mt-3">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Reconnect
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <span className="text-blue-500 font-bold">SF</span>
                  </div>
                  <div>
                    <CardTitle className="text-base">Salesforce</CardTitle>
                    <CardDescription>CRM Integration</CardDescription>
                  </div>
                </div>
                <Switch checked={integrations.salesforce.connected} />
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Not connected
                </p>
                <Button variant="outline" size="sm" className="mt-3">
                  Connect
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                    <span className="text-purple-500 font-bold">SL</span>
                  </div>
                  <div>
                    <CardTitle className="text-base">Slack</CardTitle>
                    <CardDescription>Notifications</CardDescription>
                  </div>
                </div>
                <Switch checked={integrations.slack.connected} />
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Connected to #sales-alerts
                </p>
                <Button variant="outline" size="sm" className="mt-3">
                  Configure
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-blue-400/10 flex items-center justify-center">
                    <span className="text-blue-400 font-bold">ZM</span>
                  </div>
                  <div>
                    <CardTitle className="text-base">Zoom</CardTitle>
                    <CardDescription>Meeting Integration</CardDescription>
                  </div>
                </div>
                <Switch checked={integrations.zoom.connected} />
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Not connected
                </p>
                <Button variant="outline" size="sm" className="mt-3">
                  Connect
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="api" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>API Keys</CardTitle>
              <CardDescription>Manage your API keys for external integrations</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Claude API Key</Label>
                <Input
                  type="password"
                  placeholder="sk-ant-..."
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>OpenAI API Key</Label>
                <Input
                  type="password"
                  placeholder="sk-..."
                />
              </div>
              <div className="space-y-2">
                <Label>SalesMind API Key</Label>
                <div className="flex gap-2">
                  <Input
                    type="password"
                    value="rtmn_sk_live_..."
                    readOnly
                    className="font-mono"
                  />
                  <Button variant="outline">Copy</Button>
                </div>
              </div>
              <Button onClick={handleSave}>
                {saved ? <Check className="mr-2 h-4 w-4" /> : <Save className="mr-2 h-4 w-4" />}
                {saved ? 'Saved' : 'Save Keys'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>Choose how you want to be notified</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Email Notifications</p>
                  <p className="text-sm text-muted-foreground">Receive daily summary emails</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Meeting Booked Alerts</p>
                  <p className="text-sm text-muted-foreground">Get notified when a meeting is scheduled</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Response Alerts</p>
                  <p className="text-sm text-muted-foreground">Notify when leads respond to outreach</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Weekly Reports</p>
                  <p className="text-sm text-muted-foreground">Receive weekly performance summaries</p>
                </div>
                <Switch />
              </div>
              <Button onClick={handleSave}>
                {saved ? <Check className="mr-2 h-4 w-4" /> : <Save className="mr-2 h-4 w-4" />}
                {saved ? 'Saved' : 'Save Preferences'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
