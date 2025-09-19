{
  description = "Campus Life Events Backend";

  inputs = {
    naersk.url = "github:nix-community/naersk/master";
    nixpkgs.url = "github:NixOS/nixpkgs/nixpkgs-unstable";
    utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, utils, naersk }:
    utils.lib.eachDefaultSystem (system:
      let
        pkgs = import nixpkgs { inherit system; };
        naersk-lib = pkgs.callPackage naersk { };
        name = "cl-backend";

        rustBuild = naersk-lib.buildPackage {
          src = ./.;
          buildInputs = with pkgs; [ openssl pkg-config perl ];
          nativeBuildInputs = with pkgs; [ pkg-config perl ];
        };

        dockerImage = pkgs.dockerTools.buildImage {
          name = name;
          tag = "latest";
          copyToRoot = [ 
            pkgs.cacert 
            (pkgs.writeScriptBin "entrypoint.sh" ''
              #!${pkgs.bash}/bin/bash
              exec "${rustBuild}/bin/${name}" "$@"
            '')
          ];
          config = {
            Entrypoint = [ "/bin/entrypoint.sh" ];
            ExposedPorts = { "8080/tcp" = {}; };
            WorkingDir = "/";  # Set working directory to root so relative paths work
            Env = [
              "SSL_CERT_FILE=${pkgs.cacert}/etc/ssl/certs/ca-bundle.crt"
            ];
          };
        };
      in
      {
        defaultPackage = rustBuild;
        packages = {
          default = rustBuild;
          cl-backend = rustBuild;
          dockerImage = dockerImage;
        };

        defaultApp = {
          type = "app";
          program = "${rustBuild}/bin/${name}";
        };
      });
}
