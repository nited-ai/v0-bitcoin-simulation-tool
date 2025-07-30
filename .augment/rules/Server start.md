---
type: "agent_requested"
description: "start dev server"
---
Before starting the dev server kill all processes and running servers and clear the next.js cache.
There's often a file permission error with the .next/trace file that's preventing the server from starting. This is a common Windows issue with Next.js development servers. 

This error can also occur if you run the dev mode in one terminal and try to build the project in another (second) terminal at the same time. Try to turn off NPM run dev and then run npm, clean npm cache clean --force and build it.