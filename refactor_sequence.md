Delete old service:
```bash
sudo systemctl disable --now echoes-of-tomorrow.service
sudo rm /etc/systemd/system/echoes-of-tomorrow.service
sudo systemctl daemon-reload
systemctl list-unit-files --type=service
```
Add new service:
```bash
git clone http://github.com/basbaccarne/wonder26
cd wonder26
sudo cp services/wonder26.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable wonder26.service
sudo systemctl start wonder26.service
```