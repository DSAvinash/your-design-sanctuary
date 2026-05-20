import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import PlantDiseaseForecast from "@/components/PlantDiseaseForecast";
import FloatingChatLauncher from "@/components/FloatingChatLauncher";

const WeatherForecast = () => {
  return (
    <div className="bg-surface scroll-smooth min-h-screen">
      <Navbar />
      <main className="pt-20">
        <PlantDiseaseForecast />
      </main>
      <Footer />
      <FloatingChatLauncher />
    </div>
  );
};

export default WeatherForecast;
