#!/bin/bash
cd
if [ "$localhost" = true ]; then
  jupyter kernelgateway --JupyterWebsocketPersonality.list_kernels=True
else
  jupyter kernelgateway --ip=0.0.0.0 --JupyterWebsocketPersonality.list_kernels=True --KernelGatewayApp.allow_origin='*' --Application.log_level=50
fi
