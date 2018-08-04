<script>
  import { G } from '~/js/data.js'

  export default {
    data() {
      return {
        g: G,
        content: '',
        output: '',
        error: '',
        val_map: {},
        batch_tx_map: {},
        spendable: false,
        delegatable: true,
        delegate: ''
      }
    },
    methods: {
      replace(content, replacement) {
        return this.objReplace(content, replacement, this.val_map)
      },
      objReplace(content, replacement, mapping_obj) {
        return content.replace(new RegExp(Object.keys(replacement).join('|'), 'g'), m => {
          return mapping_obj ? mapping_obj[replacement[m]] : replacement[m]
        })
      },
      tryBatchTransfer() {
        try {
          this.batchTransfer()
        } catch(err) {
          this.error = err.stack
        }
      },
      batchTransfer() {
        const transfer_obj = JSON.parse(this.content)

        const transfer_lst = transfer_obj.transactions
        const contracts = transfer_obj.contracts

        let p = tezbridge({method: 'public_key_hash'}).then(admin => {
          this.val_map.ADMIN = admin
          this.g.admin = admin
        })

        transfer_lst.forEach((transaction, index) => {
          p = p.then(() => {

            return tezbridge({
              method: 'operations',
              operations: transaction.items.map(x => {
                return {
                  method: 'transfer',
                  amount: x.amount || 0,
                  fee: x.fee || 0,
                  gas_limit: x.gas_limit || "400000",
                  destination: this.objReplace(x.destination, contracts),
                  parameters: JSON.parse(this.objReplace(JSON.stringify(x.parameters), contracts))
                }
              })
            })
            .then(x => {
              this.batch_tx_map[`tx(${transaction.name || index})`] = x.operation_id
              this.output = JSON.stringify(this.batch_tx_map, null, 4)

              return new Promise((resolve, reject) => {
                let count = 0
                const t = setInterval(() => {
                  tezbridge({
                    method: 'head_custom',
                    path: '/operation_hashes'
                  })
                  .then(data => {
                    if (data.toString().indexOf(x.operation_id) > -1 || count++ > 4) {
                      clearInterval(t)
                      resolve()
                    }
                  })
                  .catch(err => {
                    clearInterval(t)
                    reject(err)
                  })
                }, 15 * 1000)
              })
            })
            
          })
        })

        p.then(() => {
          this.output = 'DONE!\n' + JSON.stringify(this.batch_tx_map, null, 4)
        }).catch(err => {
          this.error = err instanceof Error ? err.stack : err
        })
      },
      tryDeploy(no_injection) {
        try {
          this.deploy(no_injection)
        } catch(err) {
          this.error = err.stack
        }
      },
      deploy(no_injection) {
        if (!no_injection) {
          if (!confirm('Have you checked before?'))
            return false
        }

        this.val_map = {}

        const deploy_obj = JSON.parse(this.content)
        
        const order = deploy_obj.order
        const replacement = deploy_obj.replacement
        const contracts = deploy_obj.contracts

        let p = tezbridge({method: 'public_key_hash'}).then(admin => {
          this.val_map.ADMIN = admin
          this.g.admin = admin
        })

        order.forEach(name => {
          p = p.then(() => {

            const script_raw = JSON.stringify(contracts[name].script)
            const storage_raw = JSON.stringify(contracts[name].storage)

            const code = JSON.parse(this.replace(script_raw, replacement))
            const storage = JSON.parse(this.replace(storage_raw, replacement))

            return tezbridge({
              method: 'originate', 
              no_injection,
              balance: 0,
              script: {
                code,
                storage
              },
              spendable: this.spendable,
              delegatable: this.delegatable,
              delegate: this.delegate ? this.delegate : undefined
            })
            .then(x => {
              this.val_map[`CONTRACT.${name}`] = [].concat.apply([], x.contracts)[0]
              this.output = JSON.stringify(this.val_map, null, 4)

              return new Promise((resolve, reject) => {
                let count = 0
                const t = setInterval(() => {
                  tezbridge({
                    method: 'head_custom',
                    path: '/operation_hashes'
                  })
                  .then(data => {
                    if (data.toString().indexOf(x.operation_id) > -1 || count++ > 4) {
                      clearInterval(t)
                      resolve()
                    }
                  })
                  .catch(err => {
                    clearInterval(t)
                    reject(err)
                  })
                }, 15 * 1000)
              })
            })

          })
        })

        p.then(() => {
          this.output = 'DONE!\n' + JSON.stringify(this.val_map, null, 4)
          this.batch_tx_map = {}
          
          if (!no_injection)
            this.g.deployed_contracts = JSON.parse(this.output)
        }).catch(err => {
          this.error = err instanceof Error ? err.stack : err
        })
      }
    }
  }
</script>

<template>
  <div>
    <textarea placeholder="input deployment or transaction JSON here" v-model="content"></textarea>
    <div class="option">
      <label><span>spendable:</span> <input type="checkbox" v-model="spendable" /></label> <br>
      <label><span>delegatable:</span> <input type="checkbox" v-model="delegatable" /></label> <br>
      <label><span>delegate:</span> <input v-model="delegate" /></label> <br> 
    </div>
    <button @click="tryDeploy(true)">Check</button>
    <button @click="tryDeploy(false)">Deploy</button>
    <button @click="tryBatchTransfer">BatchTransfer</button>

    <button @click="output = ''; error = ''" class="clear-btn">Clear</button>
    <pre class="output">{{output}}</pre>
    <pre class="error">{{error}}</pre>
  </div>
</template>

<style scoped>
textarea { font-family: consolas, monospace; width: 100%; height: 300px; padding: 8px;}
.option {line-height: 2}
.option input {margin-left: 8px;}
.output {background: #e8f8dc; font-family: consolas, monospace; overflow: auto; padding: 8px; margin: 8px 0;}
.error {background: #ffe8e8; color: red; font-family: consolas, monospace; overflow: auto;  padding: 8px; margin: 8px 0;}
button {margin: 8px;}
a {text-decoration: none}
.clear-btn {float: right;}
</style>