import { ZapIcon, BrainIcon, BoxIcon, RocketIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import PricingCard from "@/components/pricing/pricing-card"

export default function PricingSection() {
  return (
    <section id="pricing" className="bg-black/50 backdrop-blur-sm py-12 md:py-20 border-t border-border/40">
      <div className="container px-4 md:px-6">
        <div className="text-center mb-10 md:mb-16">
          <Badge className="mb-4" variant="outline">
            Pricing
          </Badge>
          <h2 className="text-2xl md:text-3xl lg:text-5xl font-bold mb-4">Simple, Transparent Pricing</h2>
          <p className="text-lg md:text-xl text-muted-foreground max-w-[600px] mx-auto">
            Choose the plan that fits your needs.
          </p>
        </div>

        {/* For Individuals */}
        <div className="mb-16">
          <h3 className="text-2xl font-bold mb-8 text-center">For Individuals</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 max-w-[1200px] mx-auto">
            <PricingCard
              title="Free"
              price="$0"
              description="Perfect for individual developers and casual use."
              features={[
                "Basic repository summaries",
                "File overviews",
                "Basic code explanations",
                "5 repositories/day",
              ]}
              buttonText="Sign in with GitHub"
              buttonVariant="outline"
              className="h-full"
              planType="free"
            />

            <PricingCard
              title="Pro"
              price="$19"
              description="For professional developers who need more power."
              features={[
                "Advanced repository analysis",
                "In-depth code explanations",
                "Interactive code exploration",
                "Private repository support",
                "Unlimited repositories",
                "Priority support",
              ]}
              buttonText="Upgrade to Pro"
              badge={{ text: "POPULAR" }}
              className="h-full"
              planType="pro"
            />

            <PricingCard
              title={
                <div className="flex items-center gap-2">
                  <ZapIcon className="h-6 w-6 text-yellow-400" />
                  ULTRA
                </div>
              }
              price="$4,269"
              description="Unleash the full power of AI for your development."
              features={[
                { text: "Unlimited repositories per day", icon: <ZapIcon className="h-3 w-3 text-yellow-400" /> },
                { text: "Custom RAG implementation", icon: <BrainIcon className="h-3 w-3 text-blue-400" /> },
                { text: "Your own AI space & environment", icon: <BoxIcon className="h-3 w-3 text-green-400" /> },
                { text: "Create your own AI assistant", icon: <RocketIcon className="h-3 w-3 text-red-400" /> },
                { text: "Tailored onboarding & training" },
                { text: "Email support" },
                { text: "Early access to new features" },
              ]}
              buttonText="Contact for ULTRA"
              className="h-full bg-gradient-to-br from-primary/20 to-purple-900/30 border-primary/50"
              badge={{
                text: "ULTRA",
                className: "bg-gradient-to-r from-primary to-purple-600 text-white",
              }}
              buttonVariant={null}
              iconColor="text-white"
              isUltra={true}
              planType="ultra"
            />
          </div>
        </div>

        {/* For Teams and Companies */}
        <div>
          <h3 className="text-2xl font-bold mb-8 text-center">For Teams and Companies</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 max-w-[900px] mx-auto">
            <PricingCard
              title="Team"
              price="$49"
              priceDetail="/user/month"
              description="For collaborative teams."
              features={[
                "Everything in Pro plan",
                "Team collaboration features",
                "Centralized billing",
                "User management dashboard",
                "Private repository support",
                "Shared AI insights across team",
                "Priority email support",
              ]}
              buttonText="Start a Team Plan"
              buttonVariant="outline"
              className="h-full border-primary/30"
              planType="team"
            />

            <PricingCard
              title="Enterprise"
              price="Custom Pricing"
              description="For larger companies."
              features={[
                "Everything in Team plan",
                "SAML Single Sign-On",
                "Advanced security controls",
                "Audit logs & compliance",
                "Custom contracts & SLAs",
                "Dedicated account manager",
                "Custom AI model training",
                "Data isolation and training opt-out",
                "Priority access for better performance",
              ]}
              buttonText="Contact Us"
              buttonVariant="outline"
              className="h-full border-primary/30"
              planType="enterprise"
            />
          </div>
        </div>
      </div>
    </section>
  )
}
