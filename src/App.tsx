import { Navigate, Route, Routes } from 'react-router-dom';
import { I18nProvider } from '@/i18n/i18n';
import { ToastProvider } from '@/components/ui';
import { GuidedDemo } from '@/components/GuidedDemo';
import Landing from '@/pages/Landing';
import SegmentInfo from '@/pages/SegmentInfo';
import { CustomerLayout } from '@/pages/customer/CustomerLayout';
import Onboarding from '@/pages/customer/Onboarding';
import Results from '@/pages/customer/Results';
import PaymentOptions from '@/pages/customer/PaymentOptions';
import BookSurvey from '@/pages/customer/BookSurvey';
import Portal from '@/pages/customer/Portal';
import ChooseAccount from '@/pages/customer/ChooseAccount';
import ProposalDoc from '@/pages/ProposalDoc';
import PartnerLogin from '@/pages/console/PartnerLogin';
import { ConsoleLayout } from '@/pages/console/ConsoleLayout';
import Overview from '@/pages/console/Overview';
import Pipeline from '@/pages/console/Pipeline';
import CustomerDetail from '@/pages/console/CustomerDetail';
import RoofAssessmentPage from '@/pages/console/RoofAssessmentPage';
import EnergyStudio from '@/pages/console/EnergyStudio';
import Commercial from '@/pages/console/Commercial';
import Operations from '@/pages/console/Operations';
import Portfolio from '@/pages/console/Portfolio';
import Settings from '@/pages/console/Settings';
import NotFound from '@/pages/NotFound';

export default function App() {
  return (
    <I18nProvider>
      <ToastProvider>
        <Routes>
          <Route element={<CustomerLayout />}>
            <Route path="/" element={<Landing />} />
            <Route path="/segments/:segment" element={<SegmentInfo />} />
            <Route path="/start" element={<Onboarding />} />
            <Route path="/my" element={<Portal />} />
            <Route path="/my/plan" element={<Results />} />
            <Route path="/my/payment" element={<PaymentOptions />} />
            <Route path="/my/book" element={<BookSurvey />} />
            <Route path="/my/accounts" element={<ChooseAccount />} />
          </Route>
          <Route path="/proposal/:id" element={<ProposalDoc />} />
          <Route path="/partner" element={<PartnerLogin />} />
          <Route path="/console" element={<ConsoleLayout />}>
            <Route index element={<Overview />} />
            <Route path="pipeline" element={<Pipeline />} />
            <Route path="customers/:id" element={<CustomerDetail />} />
            <Route path="roof" element={<RoofAssessmentPage />} />
            <Route path="roof/:id" element={<RoofAssessmentPage />} />
            <Route path="studio" element={<EnergyStudio />} />
            <Route path="studio/:id" element={<EnergyStudio />} />
            <Route path="commercial" element={<Commercial />} />
            <Route path="commercial/:id" element={<Commercial />} />
            <Route path="operations" element={<Operations />} />
            <Route path="portfolio" element={<Portfolio />} />
            <Route path="settings" element={<Settings />} />
          </Route>
          <Route path="/home" element={<Navigate to="/" replace />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
        <GuidedDemo />
      </ToastProvider>
    </I18nProvider>
  );
}
