; WHMetcalfe Bid System — Inno Setup installer script
; Build with: iscc setup.iss  (from the installer\ directory)
; Requires: Inno Setup 6+ — https://jrsoftware.org/isinfo.php

#define AppName      "WHMetcalfe Bid System"
#define AppVersion   "1.0"
#define AppPublisher "WHMetcalfe HVAC"
#define AppURL       "http://localhost:8000"
#define ServiceName  "WHMetcalfe-BidSystem"
#define PGService    "WHMetcalfe-PostgreSQL"
; Unique GUID — do not change after first release (used for upgrade detection)
#define AppId        "{{A3F8C2D1-4B7E-4F9A-8C3D-2E5B1A6F0D4C}"

[Setup]
AppId={#AppId}
AppName={#AppName}
AppVersion={#AppVersion}
AppPublisher={#AppPublisher}
DefaultDirName={autopf}\WHMetcalfe-BidSystem
DefaultGroupName={#AppName}
OutputBaseFilename=WHMetcalfe-BidSystem-Setup
OutputDir=..\dist
Compression=lzma2/ultra64
SolidCompression=yes
PrivilegesRequired=admin
WizardStyle=modern
WizardSizePercent=120
SetupIconFile=assets\icon.ico
UninstallDisplayIcon={app}\assets\icon.ico
DisableProgramGroupPage=yes
; Upgrade: run over existing install without uninstalling first
CloseApplications=yes
RestartApplications=no

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Files]
; --- Python (embedded + pre-installed packages, built by build-installer.bat) ---
Source: "C:\WMBuild\python\*"; DestDir: "{app}\python"; Flags: recursesubdirs ignoreversion

; --- PostgreSQL binaries (zip extracted by build-installer.bat) ---
Source: "C:\WMBuild\pgsql\*"; DestDir: "{app}\pgsql"; Flags: recursesubdirs ignoreversion

; --- NSSM ---
Source: "C:\WMBuild\nssm\nssm.exe"; DestDir: "{app}\nssm"; Flags: ignoreversion

; --- Application code ---
Source: "..\backend\*"; DestDir: "{app}\backend"; \
  Flags: recursesubdirs ignoreversion; \
  Excludes: "__pycache__,*.pyc,.env,.venv,node_modules,backups"

; --- Pre-built React frontend ---
Source: "..\frontend\dist\*"; DestDir: "{app}\frontend\dist"; \
  Flags: recursesubdirs ignoreversion

; --- Setup helper ---
Source: "setup_helper.py"; DestDir: "{app}\installer"; Flags: ignoreversion

; --- Assets ---
Source: "assets\*"; DestDir: "{app}\assets"; Flags: recursesubdirs ignoreversion

[Icons]
Name: "{group}\{#AppName}"; Filename: "{app}\assets\icon.ico"
Name: "{group}\Open in Browser"; Filename: "http://localhost:{code:GetPort}"
Name: "{group}\Uninstall {#AppName}"; Filename: "{uninstallexe}"

[Code]
// ─── Custom wizard pages ───────────────────────────────────────────────────

var
  ConfigPage:   TWizardPage;
  AdminUser:    TEdit;
  AdminPass:    TEdit;
  AdminPass2:   TEdit;
  DBPass:       TEdit;
  PortEdit:     TEdit;
  SmtpHost:     TEdit;
  SmtpUser:     TEdit;
  SmtpPass:     TEdit;
  IsUpgrade:    Boolean;

function GetPort(Param: String): String;
begin
  if PortEdit <> nil then
    Result := PortEdit.Text
  else
    Result := '8000';
end;

procedure CreateLabel(Page: TWizardPage; const Caption: String; Top, Left, Width: Integer);
var lbl: TLabel;
begin
  lbl        := TLabel.Create(Page);
  lbl.Parent := Page.Surface;
  lbl.Caption := Caption;
  lbl.Top    := Top;
  lbl.Left   := Left;
  lbl.Width  := Width;
  lbl.Font.Size := 8;
end;

function CreateInput(Page: TWizardPage; Top, Left, Width: Integer; IsPassword: Boolean): TEdit;
var ed: TEdit;
begin
  ed            := TEdit.Create(Page);
  ed.Parent     := Page.Surface;
  ed.Top        := Top;
  ed.Left       := Left;
  ed.Width      := Width;
  ed.Height     := 22;
  if IsPassword then ed.PasswordChar := '*';
  Result := ed;
end;

procedure InitializeWizard;
var Y: Integer;
begin
  // Detect upgrade
  IsUpgrade := RegKeyExists(HKLM, 'Software\Microsoft\Windows\CurrentVersion\Uninstall\{#AppId}_is1');

  if IsUpgrade then Exit; // Skip config page on upgrade

  ConfigPage := CreateCustomPage(wpSelectDir, 'Application Configuration',
    'Enter settings for your WHMetcalfe Bid System installation.');

  Y := 4;

  // ── Admin account ─────────────────────────────────────────
  CreateLabel(ConfigPage, 'Admin username', Y, 0, 180);
  Y := Y + 16;
  AdminUser := CreateInput(ConfigPage, Y, 0, 200, False);
  AdminUser.Text := 'admin';
  Y := Y + 30;

  CreateLabel(ConfigPage, 'Admin password', Y, 0, 180);
  Y := Y + 16;
  AdminPass := CreateInput(ConfigPage, Y, 0, 200, True);
  Y := Y + 30;

  CreateLabel(ConfigPage, 'Confirm admin password', Y, 0, 180);
  Y := Y + 16;
  AdminPass2 := CreateInput(ConfigPage, Y, 0, 200, True);
  Y := Y + 34;

  // ── Database ──────────────────────────────────────────────
  CreateLabel(ConfigPage, '── Database ─────────────────────────────', Y, 0, 400);
  Y := Y + 18;
  CreateLabel(ConfigPage, 'Database password (internal use — save this somewhere safe)', Y, 0, 380);
  Y := Y + 16;
  DBPass := CreateInput(ConfigPage, Y, 0, 260, True);
  Y := Y + 34;

  // ── App port ──────────────────────────────────────────────
  CreateLabel(ConfigPage, '── Network ──────────────────────────────', Y, 0, 400);
  Y := Y + 18;
  CreateLabel(ConfigPage, 'Application port (default: 8000)', Y, 0, 240);
  Y := Y + 16;
  PortEdit := CreateInput(ConfigPage, Y, 0, 100, False);
  PortEdit.Text := '8000';
  Y := Y + 34;

  // ── SMTP (optional) ───────────────────────────────────────
  CreateLabel(ConfigPage, '── Email / SMTP (optional — leave blank to skip) ──', Y, 0, 400);
  Y := Y + 18;
  CreateLabel(ConfigPage, 'SMTP host', Y, 0, 140);
  CreateLabel(ConfigPage, 'SMTP username', Y, 160, 160);
  Y := Y + 16;
  SmtpHost := CreateInput(ConfigPage, Y, 0,  150, False);
  SmtpUser := CreateInput(ConfigPage, Y, 160, 200, False);
  Y := Y + 30;
  CreateLabel(ConfigPage, 'SMTP password', Y, 0, 180);
  Y := Y + 16;
  SmtpPass := CreateInput(ConfigPage, Y, 0, 200, True);
end;

function NextButtonClick(CurPageID: Integer): Boolean;
begin
  Result := True;
  if IsUpgrade then Exit;
  if CurPageID <> ConfigPage.ID then Exit;

  if AdminPass.Text = '' then begin
    MsgBox('Admin password cannot be empty.', mbError, MB_OK);
    Result := False; Exit;
  end;
  if AdminPass.Text <> AdminPass2.Text then begin
    MsgBox('Admin passwords do not match.', mbError, MB_OK);
    Result := False; Exit;
  end;
  if DBPass.Text = '' then begin
    MsgBox('Database password cannot be empty.', mbError, MB_OK);
    Result := False; Exit;
  end;
  if Length(AdminPass.Text) < 8 then begin
    MsgBox('Admin password must be at least 8 characters.', mbError, MB_OK);
    Result := False; Exit;
  end;
end;

// ─── Post-install step ────────────────────────────────────────────────────

procedure CurStepChanged(CurStep: TSetupStep);
var
  PythonExe, HelperScript, Params: String;
  ResultCode: Integer;
begin
  if CurStep <> ssPostInstall then Exit;

  PythonExe    := ExpandConstant('{app}\python\python.exe');
  HelperScript := ExpandConstant('{app}\installer\setup_helper.py');

  if IsUpgrade then begin
    Params := Format('"%s" upgrade "%s"',
                     [HelperScript, ExpandConstant('{app}')]);
  end else begin
    Params := Format('"%s" init "%s" "%s" "%s" "%s" "%s" "%s" "%s"', [
      HelperScript,
      ExpandConstant('{app}'),
      DBPass.Text,
      AdminPass.Text,
      PortEdit.Text,
      SmtpHost.Text,
      SmtpUser.Text,
      SmtpPass.Text
    ]);
  end;

  if not Exec(PythonExe, Params, ExpandConstant('{app}'),
              SW_HIDE, ewWaitUntilTerminated, ResultCode) then begin
    MsgBox('Setup helper failed to run. Check the install log.', mbError, MB_OK);
  end else if ResultCode <> 0 then begin
    MsgBox(Format('Configuration step exited with code %d. The application may not start correctly.', [ResultCode]),
           mbError, MB_OK);
  end;
end;

[UninstallRun]
; Stop and remove both services before files are deleted
Filename: "sc.exe"; Parameters: "stop {#ServiceName}";  RunOnceId: "StopApp"; Flags: runhidden
Filename: "sc.exe"; Parameters: "stop {#PGService}";    RunOnceId: "StopPG";  Flags: runhidden
Filename: "{app}\nssm\nssm.exe"; Parameters: "remove {#ServiceName} confirm"; RunOnceId: "RemoveApp"; Flags: runhidden; AfterInstall:
Filename: "{app}\nssm\nssm.exe"; Parameters: "remove {#PGService} confirm";   RunOnceId: "RemovePG";  Flags: runhidden

[UninstallDelete]
; Remove generated data directories (prompts user first via Code section)
Type: filesandordirs; Name: "{app}\data"
Type: filesandordirs; Name: "{app}\python\__pycache__"

[Code]
// Warn before uninstall that DB will be deleted
function InitializeUninstall(): Boolean;
begin
  Result := MsgBox(
    'This will remove the WHMetcalfe Bid System and its database.' + #13#10 +
    'Back up your data first if needed.' + #13#10#13#10 +
    'Continue with uninstall?',
    mbConfirmation, MB_YESNO) = IDYES;
end;
