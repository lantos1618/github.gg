# Use Ubuntu as base image
FROM ubuntu:22.04

# Install Bun LTS (includes JavaScript runtime)
RUN curl -fsSL https://bun.sh/install | bash
ENV PATH="/root/.bun/bin:$PATH"

# Set up user and working directory
RUN useradd -m -s /bin/bash ubuntu
WORKDIR /home/ubuntu
USER ubuntu

CMD ["/bin/bash"] 