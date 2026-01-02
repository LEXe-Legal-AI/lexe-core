import { useState } from 'react';
import * as Tabs from '@radix-ui/react-tabs';
import {
  Settings as SettingsIcon,
  Bell,
  Link,
  Shield,
  Save,
  Globe,
  Palette,
  Moon,
  Sun,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';

const tabs = [
  { id: 'general', label: 'Generale', icon: SettingsIcon },
  { id: 'notifications', label: 'Notifiche', icon: Bell },
  { id: 'integrations', label: 'Integrazioni', icon: Link },
  { id: 'security', label: 'Sicurezza', icon: Shield },
];

export function Settings() {
  const [activeTab, setActiveTab] = useState('general');
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system');

  // Form states
  const [generalSettings, setGeneralSettings] = useState({
    companyName: 'LEO ITC',
    defaultLanguage: 'it',
    timezone: 'Europe/Rome',
    dateFormat: 'DD/MM/YYYY',
  });

  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    pushNotifications: true,
    newConversation: true,
    conversationAssigned: true,
    dailyDigest: false,
    weeklyReport: true,
  });

  const [securitySettings, setSecuritySettings] = useState({
    twoFactorEnabled: false,
    sessionTimeout: '30',
  });

  const handleSave = () => {
    // In real app, this would save to API
    console.log('Saving settings...', {
      general: generalSettings,
      notifications: notificationSettings,
      security: securitySettings,
      theme,
    });
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Impostazioni</h1>
        <p className="text-muted-foreground">
          Configura le preferenze della piattaforma LEO
        </p>
      </div>

      <Tabs.Root
        value={activeTab}
        onValueChange={setActiveTab}
        className="flex flex-col lg:flex-row gap-6"
      >
        {/* Tabs List */}
        <Card className="lg:w-64 h-fit">
          <CardContent className="p-2">
            <Tabs.List className="flex flex-col space-y-1">
              {tabs.map((tab) => (
                <Tabs.Trigger
                  key={tab.id}
                  value={tab.id}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-md text-left transition-colors',
                    'hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    activeTab === tab.id
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground'
                  )}
                >
                  <tab.icon className="h-4 w-4" />
                  {tab.label}
                </Tabs.Trigger>
              ))}
            </Tabs.List>
          </CardContent>
        </Card>

        {/* Tab Content */}
        <div className="flex-1">
          {/* General Settings */}
          <Tabs.Content value="general" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Impostazioni Generali</CardTitle>
                <CardDescription>
                  Configura le impostazioni di base della piattaforma
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="companyName">Nome Azienda</Label>
                    <Input
                      id="companyName"
                      value={generalSettings.companyName}
                      onChange={(e) =>
                        setGeneralSettings({
                          ...generalSettings,
                          companyName: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="language">Lingua Predefinita</Label>
                    <select
                      id="language"
                      value={generalSettings.defaultLanguage}
                      onChange={(e) =>
                        setGeneralSettings({
                          ...generalSettings,
                          defaultLanguage: e.target.value,
                        })
                      }
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <option value="it">Italiano</option>
                      <option value="en">English</option>
                      <option value="de">Deutsch</option>
                      <option value="fr">Francais</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="timezone">Fuso Orario</Label>
                    <select
                      id="timezone"
                      value={generalSettings.timezone}
                      onChange={(e) =>
                        setGeneralSettings({
                          ...generalSettings,
                          timezone: e.target.value,
                        })
                      }
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <option value="Europe/Rome">Europe/Rome (CET)</option>
                      <option value="Europe/London">Europe/London (GMT)</option>
                      <option value="America/New_York">America/New York (EST)</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dateFormat">Formato Data</Label>
                    <select
                      id="dateFormat"
                      value={generalSettings.dateFormat}
                      onChange={(e) =>
                        setGeneralSettings({
                          ...generalSettings,
                          dateFormat: e.target.value,
                        })
                      }
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                      <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                      <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                    </select>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Palette className="h-5 w-5" />
                    <h3 className="font-medium">Tema</h3>
                  </div>
                  <div className="flex gap-2">
                    {[
                      { value: 'light' as const, icon: Sun, label: 'Chiaro' },
                      { value: 'dark' as const, icon: Moon, label: 'Scuro' },
                      { value: 'system' as const, icon: Globe, label: 'Sistema' },
                    ].map(({ value, icon: Icon, label }) => (
                      <Button
                        key={value}
                        variant={theme === value ? 'default' : 'outline'}
                        onClick={() => setTheme(value)}
                        className="flex-1"
                      >
                        <Icon className="h-4 w-4 mr-2" />
                        {label}
                      </Button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </Tabs.Content>

          {/* Notifications Settings */}
          <Tabs.Content value="notifications" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Preferenze Notifiche</CardTitle>
                <CardDescription>
                  Configura come e quando ricevere le notifiche
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <h3 className="font-medium">Canali di Notifica</h3>
                  <div className="space-y-3">
                    <label className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Notifiche Email</p>
                        <p className="text-sm text-muted-foreground">
                          Ricevi notifiche via email
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={notificationSettings.emailNotifications}
                        onChange={(e) =>
                          setNotificationSettings({
                            ...notificationSettings,
                            emailNotifications: e.target.checked,
                          })
                        }
                        className="h-5 w-5 rounded border-gray-300"
                      />
                    </label>
                    <label className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Notifiche Push</p>
                        <p className="text-sm text-muted-foreground">
                          Ricevi notifiche push nel browser
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={notificationSettings.pushNotifications}
                        onChange={(e) =>
                          setNotificationSettings({
                            ...notificationSettings,
                            pushNotifications: e.target.checked,
                          })
                        }
                        className="h-5 w-5 rounded border-gray-300"
                      />
                    </label>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h3 className="font-medium">Eventi</h3>
                  <div className="space-y-3">
                    <label className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Nuova Conversazione</p>
                        <p className="text-sm text-muted-foreground">
                          Quando viene avviata una nuova conversazione
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={notificationSettings.newConversation}
                        onChange={(e) =>
                          setNotificationSettings({
                            ...notificationSettings,
                            newConversation: e.target.checked,
                          })
                        }
                        className="h-5 w-5 rounded border-gray-300"
                      />
                    </label>
                    <label className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Conversazione Assegnata</p>
                        <p className="text-sm text-muted-foreground">
                          Quando una conversazione ti viene assegnata
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={notificationSettings.conversationAssigned}
                        onChange={(e) =>
                          setNotificationSettings({
                            ...notificationSettings,
                            conversationAssigned: e.target.checked,
                          })
                        }
                        className="h-5 w-5 rounded border-gray-300"
                      />
                    </label>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h3 className="font-medium">Report</h3>
                  <div className="space-y-3">
                    <label className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Digest Giornaliero</p>
                        <p className="text-sm text-muted-foreground">
                          Riepilogo giornaliero delle attivita
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={notificationSettings.dailyDigest}
                        onChange={(e) =>
                          setNotificationSettings({
                            ...notificationSettings,
                            dailyDigest: e.target.checked,
                          })
                        }
                        className="h-5 w-5 rounded border-gray-300"
                      />
                    </label>
                    <label className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Report Settimanale</p>
                        <p className="text-sm text-muted-foreground">
                          Report completo delle prestazioni
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={notificationSettings.weeklyReport}
                        onChange={(e) =>
                          setNotificationSettings({
                            ...notificationSettings,
                            weeklyReport: e.target.checked,
                          })
                        }
                        className="h-5 w-5 rounded border-gray-300"
                      />
                    </label>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Tabs.Content>

          {/* Integrations Settings */}
          <Tabs.Content value="integrations" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Integrazioni</CardTitle>
                <CardDescription>
                  Collega LEO con altri servizi e piattaforme
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  {
                    name: 'WhatsApp Business',
                    description: 'Collega il tuo account WhatsApp Business',
                    connected: true,
                    icon: '📱',
                  },
                  {
                    name: 'Zammad',
                    description: 'Sistema di ticketing Zammad',
                    connected: true,
                    icon: '🎫',
                  },
                  {
                    name: 'Email SMTP',
                    description: 'Configura il server email per invii',
                    connected: true,
                    icon: '📧',
                  },
                  {
                    name: 'Slack',
                    description: 'Ricevi notifiche su Slack',
                    connected: false,
                    icon: '💬',
                  },
                  {
                    name: 'Microsoft Teams',
                    description: 'Integrazione con Microsoft Teams',
                    connected: false,
                    icon: '👥',
                  },
                  {
                    name: 'Webhook',
                    description: 'Configura webhook personalizzati',
                    connected: false,
                    icon: '🔗',
                  },
                ].map((integration) => (
                  <div
                    key={integration.name}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center gap-4">
                      <span className="text-2xl">{integration.icon}</span>
                      <div>
                        <p className="font-medium">{integration.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {integration.description}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant={integration.connected ? 'outline' : 'default'}
                    >
                      {integration.connected ? 'Configura' : 'Collega'}
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          </Tabs.Content>

          {/* Security Settings */}
          <Tabs.Content value="security" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Sicurezza</CardTitle>
                <CardDescription>
                  Gestisci le impostazioni di sicurezza del tuo account
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <h3 className="font-medium">Autenticazione</h3>
                  <div className="space-y-3">
                    <label className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <p className="font-medium">
                          Autenticazione a Due Fattori (2FA)
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Aggiungi un ulteriore livello di sicurezza
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={securitySettings.twoFactorEnabled}
                        onChange={(e) =>
                          setSecuritySettings({
                            ...securitySettings,
                            twoFactorEnabled: e.target.checked,
                          })
                        }
                        className="h-5 w-5 rounded border-gray-300"
                      />
                    </label>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h3 className="font-medium">Sessione</h3>
                  <div className="space-y-2">
                    <Label htmlFor="sessionTimeout">
                      Timeout Sessione (minuti)
                    </Label>
                    <Input
                      id="sessionTimeout"
                      type="number"
                      value={securitySettings.sessionTimeout}
                      onChange={(e) =>
                        setSecuritySettings({
                          ...securitySettings,
                          sessionTimeout: e.target.value,
                        })
                      }
                      className="max-w-32"
                    />
                    <p className="text-sm text-muted-foreground">
                      Disconnetti automaticamente dopo questo periodo di
                      inattivita
                    </p>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h3 className="font-medium">Cambio Password</h3>
                  <div className="space-y-4 max-w-md">
                    <div className="space-y-2">
                      <Label htmlFor="currentPassword">Password Attuale</Label>
                      <Input id="currentPassword" type="password" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="newPassword">Nuova Password</Label>
                      <Input id="newPassword" type="password" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">
                        Conferma Nuova Password
                      </Label>
                      <Input id="confirmPassword" type="password" />
                    </div>
                    <Button variant="secondary">Aggiorna Password</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Tabs.Content>

          {/* Save Button */}
          <div className="flex justify-end mt-6">
            <Button onClick={handleSave} size="lg">
              <Save className="h-4 w-4 mr-2" />
              Salva Modifiche
            </Button>
          </div>
        </div>
      </Tabs.Root>
    </div>
  );
}

export default Settings;
