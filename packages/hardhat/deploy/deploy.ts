import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  const deployedFHEChampionsVote = await deploy("FHEChampionsVote", {
    from: deployer,
    log: true,
  });

  console.log(`FHEChampionsVote contract: `, deployedFHEChampionsVote.address);
};
export default func;
func.id = "deploy_FHEChampionsVote"; // id required to prevent reexecution
func.tags = ["FHEChampionsVote"];
