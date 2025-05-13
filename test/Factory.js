const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers")
const { expect } = require("chai")
const { ethers } = require("hardhat")

describe("Factory", function () {
    const FEE = ethers.parseUnits("0.01",18)
    
    async function deployFactoryFixture(){
        const [deployer,creator,buyer] = await ethers.getSigners()
     
        const Factory = await ethers.getContractFactory("Factory")
        const factory = await Factory.deploy(FEE)
        //createToken
        const transaction = await factory.connect(creator).create("Dapp Uni","DAPP",{value:FEE})
        await transaction.wait()
        //get token address
        const tokenAddress = await factory.tokens(0)
        const token = await ethers.getContractAt("Token",tokenAddress)
        return {factory,deployer,creator,token,buyer}
    }
    async function buyTokenFixture(){
        const {factory,creator,buyer,token} = await deployFactoryFixture()
        const AMOUNT = ethers.parseUnits("10000",18)
        
        const COST = ethers.parseUnits("1",18)

       
        const transaction = await factory.connect(buyer).buy(await token.getAddress(),AMOUNT,{value:COST})
        await transaction.wait()
        return {factory,creator,buyer,token}
    }
    it("should set fee",async function(){
        const {factory} = await loadFixture(deployFactoryFixture)
        
       expect(await factory.fee()).to.equal(FEE)
    })
    it("should set owner",async function(){
        const {factory,deployer} = await loadFixture(deployFactoryFixture)
        
       expect(await factory.owner()).to.equal(deployer.address)
    })
    describe("creating",()=>{
        it("should set owner2",async function(){
            const {factory,token} = await loadFixture(deployFactoryFixture)
            
           expect(await token.owner()).to.equal(await factory.getAddress())
        })
        it("should set creator",async function(){
            const {creator,token} = await loadFixture(deployFactoryFixture)
            
           expect(await token.creator()).to.equal(await creator.getAddress())
        })
        it("should set supply",async function(){
            const {factory,token} = await loadFixture(deployFactoryFixture)
            const totalSupply = ethers.parseUnits("1000000",18)
            
           expect(await token.balanceOf(await factory.getAddress())).to.equal(totalSupply)
        })
        it("should update balance ETH",async function(){
            const {factory,token,creator} = await loadFixture(deployFactoryFixture)
            const balance = await ethers.provider.getBalance(await factory.getAddress())
            
           expect(balance).to.equal(FEE)
        })
        it("should create sale",async function(){
            const {factory,token,creator} = await loadFixture(deployFactoryFixture)
            const count = await factory.totalTokens()
            expect(count).to.equal(1)
            const sale =await factory.getTokenSale(0)
            console.log(sale)
            expect(sale.token).to.equal(await token.getAddress())
            expect(sale.creator).to.equal(creator.address)
            expect(sale.sold).to.equal(0)
            expect(sale.raised).to.equal(0)
            expect(sale.isOpen).to.equal(true)
         /* const sale =await factory.getTokenSale(0) */
        })
    })
    describe("buy",()=>{
        const AMOUNT = ethers.parseUnits("10000",18)
        
        const COST = ethers.parseUnits("1",18)
        it("should update ETH balance",async function(){
            //check contract receive ETH
          
            const {factory} = await loadFixture(buyTokenFixture)
                const balance = await ethers.provider.getBalance(await factory.getAddress())
                expect(balance).to.equal(COST+FEE)
        })
     
        it("should update ETH balance2",async function(){
            //check contract receive ETH
          
            const {token,buyer} = await loadFixture(buyTokenFixture)
                const balance = await token.balanceOf(buyer.address)
                expect(balance).to.equal(AMOUNT)
        })
        it("should update token sale3",async function(){
            //check contract receive ETH
          
            const {token,factory} = await loadFixture(buyTokenFixture)
                const sale = await factory.tokenToSale(await token.getAddress())
              
                expect(sale.sold).to.equal(AMOUNT)
                expect(sale.raised).to.equal(COST)
                expect(sale.isOpen).to.equal(true)
        })
        it("Should increase base cost", async function () {
            const { factory, token } = await loadFixture(buyTokenFixture)
      
            const sale = await factory.tokenToSale(await token.getAddress())
            const cost = await factory.getCost(sale.sold)
      
            expect(cost).to.be.equal(ethers.parseUnits("0.0002"))
          })
    })
    describe("Depositing", function () {
        const AMOUNT = ethers.parseUnits("10000", 18)
        const COST = ethers.parseUnits("2", 18)
    
        it("Sale should be closed and successfully deposits", async function () {
          const { factory, token, creator, buyer } = await loadFixture(buyTokenFixture)
    
          // Buy tokens again to reach target
          const buyTx = await factory.connect(buyer).buy(await token.getAddress(), AMOUNT, { value: COST })
          await buyTx.wait()
    
          const sale = await factory.tokenToSale(await token.getAddress())
          expect(sale.isOpen).to.equal(false)
    
          const depositTx = await factory.connect(creator).deposit(await token.getAddress())
          await depositTx.wait()
    
          const balance = await token.balanceOf(creator.address)
          expect(balance).to.equal(ethers.parseUnits("980000", 18))
        })
      })
    
      describe("Withdrawing Fees", function () {
        it("Should update ETH balances", async function () {
          const { factory, deployer } = await loadFixture(deployFactoryFixture)
    
          const transaction = await factory.connect(deployer).withdraw(FEE)
          await transaction.wait()
    
          const balance = await ethers.provider.getBalance(await factory.getAddress())
    
          expect(balance).to.equal(0)
        })
      })
})
