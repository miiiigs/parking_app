import { createBrowserRouter } from "react-router";
import { MobileShell } from "./components/MobileShell";
import { AppLayout } from "./layouts/AppLayout";
import SplashPage from "./pages/SplashPage";
import OnboardingPage from "./pages/OnboardingPage";
import AuthPage from "./pages/AuthPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import OTPPage from "./pages/OTPPage";
import HomePage from "./pages/HomePage";
import ExplorePage from "./pages/ExplorePage";
import HistoryPage from "./pages/HistoryPage";
import ProfilePage from "./pages/ProfilePage";
import GuestPage from "./pages/GuestPage";
import ParkingDetailPage from "./pages/ParkingDetailPage";
import ReservationConfirmPage from "./pages/ReservationConfirmPage";
import ActiveSessionPage from "./pages/ActiveSessionPage";
import PaymentPage from "./pages/PaymentPage";
import PaymentSuccessPage from "./pages/PaymentSuccessPage";
import ReceiptPage from "./pages/ReceiptPage";
import ReportIssuePage from "./pages/ReportIssuePage";
import WalkInQRPage from "./pages/WalkInQRPage";
import WalkInConfirmPage from "./pages/WalkInConfirmPage";
import VehicleInfoPage from "./pages/VehicleInfoPage";
import EditProfilePage from "./pages/EditProfilePage";
import EditVehiclePage from "./pages/EditVehiclePage";
import ChangePhonePage from "./pages/ChangePhonePage";
import PaymentMethodsPage from "./pages/PaymentMethodsPage";
import PrivacyPage from "./pages/PrivacyPage";
import AboutAppPage from "./pages/AboutAppPage";
import ContactSupportPage from "./pages/ContactSupportPage";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: MobileShell,
    children: [
      { index: true, Component: SplashPage },
      { path: "onboarding", Component: OnboardingPage },
      { path: "auth", Component: AuthPage },
      { path: "login", Component: LoginPage },
      { path: "register", Component: RegisterPage },
      { path: "otp", Component: OTPPage },
      { path: "parking/:id", Component: ParkingDetailPage },
      { path: "walkin-confirm", Component: WalkInConfirmPage },
      { path: "walkin-qr", Component: WalkInQRPage },
      { path: "vehicle-info", Component: VehicleInfoPage },
      { path: "edit-profile", Component: EditProfilePage },
      { path: "edit-vehicle", Component: EditVehiclePage },
      { path: "change-phone", Component: ChangePhonePage },
      { path: "payment-methods", Component: PaymentMethodsPage },
      { path: "privacy", Component: PrivacyPage },
      { path: "about", Component: AboutAppPage },
      { path: "contact-support", Component: ContactSupportPage },
      { path: "confirm", Component: ReservationConfirmPage },
      { path: "payment", Component: PaymentPage },
      { path: "payment-success", Component: PaymentSuccessPage },
      { path: "receipt", Component: ReceiptPage },
      { path: "report-issue", Component: ReportIssuePage },
      {
        Component: AppLayout,
        children: [
          { path: "home", Component: HomePage },
          { path: "explore", Component: ExplorePage },
          { path: "session", Component: ActiveSessionPage },
          { path: "history", Component: HistoryPage },
          { path: "profile", Component: ProfilePage },
          { path: "guest", Component: GuestPage },
          // legacy alias
          { path: "menu", Component: ProfilePage },
        ],
      },
    ],
  },
]);
