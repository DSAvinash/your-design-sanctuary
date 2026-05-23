import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import ScrollReveal from "./ScrollReveal";

const emailSchema = z
  .string()
  .trim()
  .email({ message: "Please enter a valid email address" })
  .max(255, { message: "Email must be less than 255 characters" });

const NewsletterSection = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = emailSchema.safeParse(email);
    if (!result.success) {
      toast.error(result.error.issues[0].message);
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from("newsletter_subscribers")
        .insert({ email: result.data.toLowerCase() });

      if (error) {
        if (error.code === "23505") {
          toast.info("You're already subscribed!");
        } else {
          toast.error("Subscription failed. Please try again.");
        }
      } else {
        toast.success("Thanks for joining! We'll keep you posted.");
        setEmail("");
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section id="newsletter" className="py-24 bg-primary text-on-primary">
      <ScrollReveal>
        <div className="max-w-[1440px] mx-auto px-8 md:px-12 flex flex-col md:flex-row justify-between items-end gap-12">
          <div className="max-w-2xl">
            <h2 className="font-headline text-4xl font-bold mb-6 tracking-tight">
              Stay informed on the season's progress.
            </h2>
            <form onSubmit={handleSubmit} className="flex gap-4 w-full max-w-md">
              <input
                className="bg-transparent border-b border-on-primary/30 w-full py-4 text-xs uppercase tracking-widest focus:border-on-primary focus:ring-0 outline-none transition-colors placeholder:text-on-primary/40 disabled:opacity-50"
                placeholder="YOUR EMAIL"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                required
                maxLength={255}
              />
              <button
                type="submit"
                disabled={loading}
                className="shrink-0 font-headline text-xs uppercase tracking-widest p-4 hover:opacity-80 text-on-primary disabled:opacity-50"
              >
                {loading ? "Joining..." : "Join"}
              </button>
            </form>
          </div>
          <div className="text-right">
            <p className="font-headline text-sm tracking-[0.2em] opacity-60">EST. 2024</p>
          </div>
        </div>
      </ScrollReveal>
    </section>
  );
};

export default NewsletterSection;
