import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { MainLayout } from './components/layout/MainLayout';

// 13 Modules
import { LoginModule } from './components/modules/LoginModule'; // Module 1
import { DashboardModule } from './components/modules/DashboardModule'; // Module 2
import { ApplicationsModule } from './components/modules/ApplicationsModule'; // Module 3
import { NewVerificationModule } from './components/modules/NewVerification/NewVerificationModule'; // Modules 4, 5, 6, 7
import { ApplicationDetailsModule } from './components/modules/ApplicationDetailsModule'; // Module 8
import { DocumentVaultModule } from './components/modules/DocumentVaultModule'; // Module 9
import { ComplianceRulesModule } from './components/modules/ComplianceRulesModule'; // Module 10
import { VerificationReportsModule } from './components/modules/VerificationReportsModule'; // Module 11
import { AuditTrailModule } from './components/modules/AuditTrailModule'; // Module 12
import { SettingsModule } from './components/modules/SettingsModule'; // Module 13

export const App: React.FC = () => {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          {/* Module 1: Login and Role Selection */}
          <Route path="/login" element={<LoginModule />} />

          {/* Internal Application Layout with Dark Navy Sidebar & Topbar */}
          <Route element={<MainLayout />}>
            {/* Module 2: Dashboard (Verification Command Center) */}
            <Route path="/" element={<DashboardModule />} />

            {/* Module 3: Applications (List & Manage) */}
            <Route path="/applications" element={<ApplicationsModule />} />

            {/* Modules 4, 5, 6, 7: New Verification (4-Step Flow) */}
            <Route path="/new-verification" element={<NewVerificationModule />} />

            {/* Module 8: Application Details (Detailed View) */}
            <Route path="/applications/:id" element={<ApplicationDetailsModule />} />

            {/* Module 9: Document Vault */}
            <Route path="/vault" element={<DocumentVaultModule />} />

            {/* Module 10: Compliance Rules (Demo) */}
            <Route path="/rules" element={<ComplianceRulesModule />} />

            {/* Module 11: Verification Reports */}
            <Route path="/reports" element={<VerificationReportsModule />} />

            {/* Module 12: Audit Trail */}
            <Route path="/audit" element={<AuditTrailModule />} />

            {/* Module 13: Settings */}
            <Route path="/settings" element={<SettingsModule />} />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AppProvider>
  );
};

export default App;
