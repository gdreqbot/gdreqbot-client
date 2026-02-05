{
  description = "NixOS electron dev environment";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = {
    self,
    nixpkgs,
    flake-utils,
  } @ inputs:
    flake-utils.lib.eachDefaultSystem (
      system: let
        pkgs = import nixpkgs {inherit system;};
        fhs = pkgs.buildFHSEnv {
          name = "electron-fhs-shell";
          targetPkgs = pkgs:
            (with pkgs; [
              alsa-lib
              atkmm
              at-spi2-atk
              cairo
              cups
              dbus
              expat
              glib
              glibc
              gtk2
              gtk3
              gtk4
              libdrm
              libgbm
              libxkbcommon
              mesa
              nspr
              nss
              nodejs
              pango
              udev
              twitch-cli
              yarn
            ])
            ++ (with pkgs.xorg; [
              libXcomposite
              libXdamage
              libXext
              libXfixes
              libXrandr
              libX11
              xcbutil
              libxcb
            ]);

            # runScript = "pnpm dev";
        };
      in {
        devShells.default = fhs.env;
      }
    );
}


