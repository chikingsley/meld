# Ollama Docker Image

Ollama makes it easy to get up and running with large language models locally using Docker.

## CPU Only
To run Ollama with CPU only, use the following command:

```bash
docker run -d -v ollama:/root/.ollama -p 11434:11434 --name ollama ollama/ollama
```
* This command pulls the `ollama/ollama` image from Docker Hub.
* `-d` runs the container in detached mode.
* `-v ollama:/root/.ollama` creates a named volume for persistence of models and data.
* `-p 11434:11434` maps the container port 11434 to the host port 11434 for access to the ollama API
* `--name ollama` sets the name of the docker container

## NVIDIA GPU
To use Ollama with NVIDIA GPUs, you need to install the NVIDIA Container Toolkit first.

### Install with Apt (Debian/Ubuntu)

1. **Configure the repository:**

   ```bash
   curl -fsSL https://nvidia.github.io/libnvidia-container/gpgkey \
       | sudo gpg --dearmor -o /usr/share/keyrings/nvidia-container-toolkit-keyring.gpg
   curl -s -L https://nvidia.github.io/libnvidia-container/stable/deb/nvidia-container-toolkit.list \
       | sed 's#deb https://#deb [signed-by=/usr/share/keyrings/nvidia-container-toolkit-keyring.gpg] https://#g' \
       | sudo tee /etc/apt/sources.list.d/nvidia-container-toolkit.list
   sudo apt-get update
   ```
2. **Install the NVIDIA Container Toolkit packages:**

   ```bash
   sudo apt-get install -y nvidia-container-toolkit
   ```

### Install with Yum or Dnf (RHEL/CentOS/Fedora)

1. **Configure the repository:**
    ```bash
    curl -s -L https://nvidia.github.io/libnvidia-container/stable/rpm/nvidia-container-toolkit.repo \
        | sudo tee /etc/yum.repos.d/nvidia-container-toolkit.repo
    ```
2. **Install the NVIDIA Container Toolkit packages:**
    ```bash
    sudo yum install -y nvidia-container-toolkit
    ```

### Configure Docker to use Nvidia driver
```bash
sudo nvidia-ctk runtime configure --runtime=docker
sudo systemctl restart docker
```

### Start the container

```bash
docker run -d --gpus=all -v ollama:/root/.ollama -p 11434:11434 --name ollama ollama/ollama
```
* This command pulls the `ollama/ollama` image from Docker Hub.
* `-d` runs the container in detached mode.
* `--gpus=all` makes all GPUs available to the container.
* `-v ollama:/root/.ollama` creates a named volume for persistence of models and data.
* `-p 11434:11434` maps the container port 11434 to the host port 11434 for access to the ollama API
* `--name ollama` sets the name of the docker container

## AMD GPU

To run Ollama using Docker with AMD GPUs, use the `rocm` tag and the following command:

```bash
docker run -d --device /dev/kfd --device /dev/dri -v ollama:/root/.ollama -p 11434:11434 --name ollama ollama/ollama:rocm
```
* This command pulls the `ollama/ollama:rocm` image from Docker Hub.
* `-d` runs the container in detached mode.
* `--device /dev/kfd --device /dev/dri` makes the necessary AMD GPU devices available to the container.
* `-v ollama:/root/.ollama` creates a named volume for persistence of models and data.
* `-p 11434:11434` maps the container port 11434 to the host port 11434 for access to the ollama API
* `--name ollama` sets the name of the docker container

## Run model locally

Once the container is running, you can run a model using the following command:

```bash
docker exec -it ollama ollama run llama3
```

* `docker exec -it ollama` executes a command in the running container named `ollama` in interactive mode.
* `ollama run llama3` tells ollama to run the `llama3` model.
