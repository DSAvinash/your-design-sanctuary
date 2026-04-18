import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import StatsSection from "@/components/StatsSection";
import DiagnosisFeature from "@/components/DiagnosisFeature";
import WheatBreak from "@/components/WheatBreak";
import PhilosophySection from "@/components/PhilosophySection";
import NewsletterSection from "@/components/NewsletterSection";
import Footer from "@/components/Footer";
import FloatingChatLauncher from "@/components/FloatingChatLauncher";

const Index = () => {
  return (
    <div className="bg-surface scroll-smooth">
      <Navbar />
      <main>
        <HeroSection />
        <StatsSection />
        <DiagnosisFeature />
        <WheatBreak />
        <PhilosophySection />
        <NewsletterSection />
      </main>
      <Footer />
      <FloatingChatLauncher />
    </div>
  );
};

export default Index;
