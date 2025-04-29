"use client"

import Image from "next/image"
import { SparklesIcon } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { motion } from "framer-motion"
import { StaggerContainer, StaggerItem, ScaleIn } from "@/components/animated-elements"

export default function FeaturesSection() {
  return (
    <section id="features" className="pb-12 md:pb-20 mt-12 md:mt-20">
      <div className="container px-4 md:px-6">
        <Tabs defaultValue="summaries" className="w-full max-w-[1000px] mx-auto">
          <TabsList className="grid grid-cols-1 sm:grid-cols-3 w-full mb-8 h-auto">
            <TabsTrigger value="summaries" className="py-3">
              AI Summaries
            </TabsTrigger>
            <TabsTrigger value="exploration" className="py-3">
              Code Exploration
            </TabsTrigger>
            <TabsTrigger value="integration" className="py-3">
              GitHub Integration
            </TabsTrigger>
          </TabsList>
          <TabsContent value="summaries" className="mt-0">
            <motion.div
              className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              <div>
                <motion.h3
                  className="text-xl md:text-2xl font-bold mb-4"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  Instant AI Summaries
                </motion.h3>
                <motion.p
                  className="text-muted-foreground mb-6"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  Get immediate AI-generated summaries of repositories, files, and code sections to quickly understand
                  their purpose and functionality.
                </motion.p>
                <StaggerContainer>
                  {[
                    "Repository overviews",
                    "File purpose explanations",
                    "Function descriptions",
                    "Complex logic simplified",
                  ].map((item, i) => (
                    <StaggerItem key={i}>
                      <div className="flex items-start gap-3 mb-3">
                        <motion.div
                          className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5"
                          whileHover={{ scale: 1.2, backgroundColor: "rgba(46, 204, 113, 0.3)" }}
                        >
                          <SparklesIcon className="h-3.5 w-3.5 text-primary" />
                        </motion.div>
                        <span>{item}</span>
                      </div>
                    </StaggerItem>
                  ))}
                </StaggerContainer>
              </div>
              <ScaleIn delay={0.3}>
                <div className="relative rounded-xl overflow-hidden border border-border">
                  <Image
                    src="/placeholder.svg?height=400&width=500"
                    alt="GitHub.GG Interface"
                    width={500}
                    height={400}
                    className="w-full object-cover"
                  />
                </div>
              </ScaleIn>
            </motion.div>
          </TabsContent>
          <TabsContent value="exploration" className="mt-0">
            <motion.div
              className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              <div>
                <motion.h3
                  className="text-xl md:text-2xl font-bold mb-4"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  Interactive Code Exploration
                </motion.h3>
                <motion.p
                  className="text-muted-foreground mb-6"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  Chat with repositories to understand complex logic and structures through AI-assisted exploration.
                </motion.p>
                <StaggerContainer>
                  {[
                    "Question answering about code",
                    "Dependency tracing",
                    "Usage examples",
                    "Alternative implementations",
                  ].map((item, i) => (
                    <StaggerItem key={i}>
                      <div className="flex items-start gap-3 mb-3">
                        <motion.div
                          className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5"
                          whileHover={{ scale: 1.2, backgroundColor: "rgba(46, 204, 113, 0.3)" }}
                        >
                          <SparklesIcon className="h-3.5 w-3.5 text-primary" />
                        </motion.div>
                        <span>{item}</span>
                      </div>
                    </StaggerItem>
                  ))}
                </StaggerContainer>
              </div>
              <ScaleIn delay={0.3}>
                <div className="relative rounded-xl overflow-hidden border border-border">
                  <Image
                    src="/placeholder.svg?height=400&width=500"
                    alt="Code Exploration Feature"
                    width={500}
                    height={400}
                    className="w-full object-cover"
                  />
                </div>
              </ScaleIn>
            </motion.div>
          </TabsContent>
          <TabsContent value="integration" className="mt-0">
            <motion.div
              className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              <div>
                <motion.h3
                  className="text-xl md:text-2xl font-bold mb-4"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  Seamless GitHub Integration
                </motion.h3>
                <motion.p
                  className="text-muted-foreground mb-6"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  Works directly within your existing GitHub workflow - just change the domain and you're ready to go.
                </motion.p>
                <StaggerContainer>
                  {[
                    "No additional tools needed",
                    "Same URL structure as GitHub",
                    "Works with private repositories",
                    "Seamless authentication",
                  ].map((item, i) => (
                    <StaggerItem key={i}>
                      <div className="flex items-start gap-3 mb-3">
                        <motion.div
                          className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5"
                          whileHover={{ scale: 1.2, backgroundColor: "rgba(46, 204, 113, 0.3)" }}
                        >
                          <SparklesIcon className="h-3.5 w-3.5 text-primary" />
                        </motion.div>
                        <span>{item}</span>
                      </div>
                    </StaggerItem>
                  ))}
                </StaggerContainer>
              </div>
              <ScaleIn delay={0.3}>
                <div className="relative rounded-xl overflow-hidden border border-border">
                  <Image
                    src="/placeholder.svg?height=400&width=500"
                    alt="GitHub Integration Feature"
                    width={500}
                    height={400}
                    className="w-full object-cover"
                  />
                </div>
              </ScaleIn>
            </motion.div>
          </TabsContent>
        </Tabs>
      </div>
    </section>
  )
}
